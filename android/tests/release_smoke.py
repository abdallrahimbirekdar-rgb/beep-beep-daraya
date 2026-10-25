"""Exercise the signed, R8-optimized release and capture real Android screens."""
import pathlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET

OUT = pathlib.Path('android-release-check')
OUT.mkdir(exist_ok=True)
PACKAGE = 'com.souqdaraya.app'

def adb(*args, check=True):
    return subprocess.run(['adb', *args], check=check, capture_output=True, timeout=30).stdout

def tree():
    # Accessibility can restart during first launch or permission dialogs.
    for attempt in range(2):
        try:
            result = adb('shell', 'uiautomator', 'dump', '/sdcard/daraya-window.xml', check=False)
            if b'dumped to' in result:
                return ET.fromstring(adb('shell', 'cat', '/sdcard/daraya-window.xml').decode())
        except (ET.ParseError, subprocess.TimeoutExpired):
            pass
        time.sleep(3)
    return None

def tap(node):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

def dismiss(root):
    # Decline optional notifications on this test device; never alter production data.
    for n in root.iter('node'):
        if n.attrib.get('resource-id') == 'android:id/button2':
            tap(n)
            return True
        if n.attrib.get('text', '').strip() in ['ليس الآن', 'لاحقًا', 'فهمت', 'ابدأ التصفح', 'تخطي']:
            tap(n)
            return True
    return False

def wait_for_page():
    deadline = time.monotonic()+100
    while time.monotonic()<deadline:
        root=tree()
        if root is None:
            # Some emulator images have a broken shell accessibility service.
            # Preserve a real screen for manual visual review instead.
            time.sleep(15)
            return None
        if dismiss(root):
            time.sleep(2)
            continue
        text=' '.join(n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in root.iter('node'))
        if 'تعذر الاتصال بالإنترنت' in text:
            raise RuntimeError('The release could not load the live site')
        web=[n for n in root.iter('node') if n.attrib.get('class')=='android.webkit.WebView']
        if web and len(list(web[0].iter('node')))>12 and ('داريا' in text or 'الرئيسية' in text):
            time.sleep(5)  # Allow fonts and shop photos to finish loading.
            return root
        time.sleep(3)
    raise RuntimeError('The release did not render its public content')

def capture(name, fragment):
    adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',
        'https://damascus-shop.com/#'+fragment, PACKAGE)
    time.sleep(20)
    root=wait_for_page()
    if root is not None:
        (OUT/(name+'.xml')).write_bytes(ET.tostring(root,encoding='utf-8'))
    (OUT/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
    if not adb('shell','pidof',PACKAGE,check=False).strip():
        raise RuntimeError('The release process stopped')
    print('Captured '+name,flush=True)

try:
    adb('install','-r','-g','souq-daraya.apk')
    adb('shell','wm','size','1080x1920')
    adb('shell','wm','density','420')
    adb('shell','settings','put','system','font_scale','1.0')
    adb('shell','cmd','statusbar','send-disable-flag','clock','notification-icons','system-icons',check=False)
    adb('logcat','-c')
    # Dismiss the optional first-open reminder prompt on this clean test install.
    adb('shell','am','start','-W','-n',PACKAGE+'/.MainActivity')
    time.sleep(12)
    adb('shell','input','keyevent','4')
    capture('01-home','home')
    capture('02-map','map')
    capture('03-restaurant-sections','example/restaurant')
    capture('04-school-services','store/f44d9750-a872-43a9-b5eb-0a4128bb0f80')
    crashes=adb('logcat','-d','-b','crash').decode(errors='replace')
    (OUT/'crash-log.txt').write_text(crashes)
    if re.search(r'Process: '+re.escape(PACKAGE)+r'[,\s]', crashes):
        raise RuntimeError('The optimized release crashed; see crash-log.txt')
finally:
    (OUT/'last-screen.png').write_bytes(adb('exec-out','screencap','-p',check=False))
    (OUT/'device-log.txt').write_bytes(adb('logcat','-d',check=False))
