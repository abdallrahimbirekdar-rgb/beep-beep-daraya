# Google Play update notices

`android-play-release.json` is the confirmed public Google Play Production release.
The website compares its versionCode with the installed DarayaVersion user agent.
The record currently matches the Play Console screenshot: Production 133 (1.4.11),
100% rollout. Open testing 140 (1.4.12) is deliberately excluded.

After Google Play confirms a future release has completed its Production rollout,
update this record with that release's versionCode/versionName and deploy the site.
Never update it when building an APK, uploading an AAB, submitting for review,
or releasing to internal/closed/open testing. The Android build workflow does not
update it. No Google Play publishing API is connected to this repository, so this
confirmation is a manual release step. If the record cannot be read or validated,
the site does not claim an update is available.
