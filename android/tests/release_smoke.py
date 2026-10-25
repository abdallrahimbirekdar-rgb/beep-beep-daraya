"""Launch the signed optimized release and capture real screens for visual QA."""
import pathlib
import re
import subprocess
import time

OUT = pathlib.Path('android-release-check')
OUT.mkdir(exist_ok=True)
PACKAGE = 'com.souqdaraya.app'

def adb(*args, check=True):
    return subprocess.run(['adb', *args], check=check, capture_output=True, timeout=45).stdout

def screenshot(name):
    image=adb('exec-out','screencap','-p')
    if not image.startswith(bytes([137,80,78,71,13,10,26,10])):
        raise RuntimeError('Invalid Android screenshot: '+name)
    (OUT/(name+'.png')).write_bytes(image)

def capture(name, fragment):
    adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',
        'https://damascus-shop.com/#'+fragment,PACKAGE)
    time.sleep(25)
    screenshot(name)
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
    adb('shell','am','start','-W','-n',PACKAGE+'/.MainActivity')
    time.sleep(12)
    # The clean test device gets the optional native reminders prompt.
    adb('shell','input','keyevent','4')
    capture('01-home','home')
    capture('02-restaurant-sections','example/restaurant')
    capture('03-apparel-sections','example/apparel')
    capture('04-school-services','store/f44d9750-a872-43a9-b5eb-0a4128bb0f80')
    crashes=adb('logcat','-d','-b','crash').decode(errors='replace')
    (OUT/'crash-log.txt').write_text(crashes)
    if re.search(r'Process: '+re.escape(PACKAGE)+r'[,\s]',crashes):
        raise RuntimeError('The optimized release crashed; see crash-log.txt')
finally:
    try:
        (OUT/'device-log.txt').write_bytes(adb('logcat','-d',check=False))
    except (subprocess.TimeoutExpired,subprocess.CalledProcessError):
        pass
