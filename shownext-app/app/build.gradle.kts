plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android { namespace = "com.shownext.app"; compileSdk = 34
    defaultConfig { applicationId = "com.shownext.app"; minSdk = 26; targetSdk = 34; versionCode = 1; versionName = "0.1.0"; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
}
