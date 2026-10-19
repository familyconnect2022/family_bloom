const { withMainApplication } = require("@expo/config-plugins");

const KOTLIN_BLOCK = `
    // Family Bloom Phase 11.2 — semantic Android notification channels.
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val manager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
      val sound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION)
      val audio = android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build()

      val normal = android.app.NotificationChannel("bloom_normal", "Bloom nhẹ nhàng", android.app.NotificationManager.IMPORTANCE_LOW).apply {
        description = "Nhắc nhẹ, không âm thanh và không rung"
        setSound(null, null)
        enableVibration(false)
      }
      val notable = android.app.NotificationChannel("bloom_notable", "Bloom đáng chú ý", android.app.NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Thông báo đáng chú ý với âm thanh nhẹ và rung"
        setSound(sound, audio)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 180)
      }
      val important = android.app.NotificationChannel("bloom_important", "Bloom quan trọng", android.app.NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Thông báo quan trọng, có heads-up, âm thanh và rung rõ"
        setSound(sound, audio)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 260, 120, 260)
      }
      manager.createNotificationChannels(listOf(normal, notable, important))
    }
`;

const JAVA_BLOCK = `
    // Family Bloom Phase 11.2 — semantic Android notification channels.
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      android.app.NotificationManager manager = (android.app.NotificationManager) getSystemService(android.content.Context.NOTIFICATION_SERVICE);
      android.net.Uri sound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
      android.media.AudioAttributes audio = new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build();
      android.app.NotificationChannel normal = new android.app.NotificationChannel("bloom_normal", "Bloom nhẹ nhàng", android.app.NotificationManager.IMPORTANCE_LOW);
      normal.setDescription("Nhắc nhẹ, không âm thanh và không rung");
      normal.setSound(null, null);
      normal.enableVibration(false);
      android.app.NotificationChannel notable = new android.app.NotificationChannel("bloom_notable", "Bloom đáng chú ý", android.app.NotificationManager.IMPORTANCE_DEFAULT);
      notable.setDescription("Thông báo đáng chú ý với âm thanh nhẹ và rung");
      notable.setSound(sound, audio);
      notable.enableVibration(true);
      notable.setVibrationPattern(new long[]{0, 180});
      android.app.NotificationChannel important = new android.app.NotificationChannel("bloom_important", "Bloom quan trọng", android.app.NotificationManager.IMPORTANCE_HIGH);
      important.setDescription("Thông báo quan trọng, có heads-up, âm thanh và rung rõ");
      important.setSound(sound, audio);
      important.enableVibration(true);
      important.setVibrationPattern(new long[]{0, 260, 120, 260});
      java.util.List<android.app.NotificationChannel> channels = java.util.Arrays.asList(normal, notable, important);
      manager.createNotificationChannels(channels);
    }
`;

module.exports = function withBloomNotificationChannels(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    if (contents.includes("Family Bloom Phase 11.2 — semantic Android notification channels")) return mod;
    const marker = "super.onCreate()";
    if (!contents.includes(marker)) throw new Error("Bloom notification channel plugin could not find MainApplication.onCreate");
    const block = mod.modResults.language === "java" ? JAVA_BLOCK : KOTLIN_BLOCK;
    contents = contents.replace(marker, `${marker}${block}`);
    mod.modResults.contents = contents;
    return mod;
  });
};
