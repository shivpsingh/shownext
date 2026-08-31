plugins {
    id("com.android.application")
}

android { namespace = "com.shownext.app"
    compileSdk = 35;
    buildFeatures { buildConfig = true }
    val analyzerUrl = providers.gradleProperty("SHOW_NEXT_API_URL").orElse("").get()
    val analyzerKey = providers.gradleProperty("SHOW_NEXT_API_KEY").orElse("").get()
    buildTypes { getByName("debug") {
        buildConfigField("String", "SHOW_NEXT_API_URL", "\"$analyzerUrl\"")
        buildConfigField("String", "SHOW_NEXT_API_KEY", "\"$analyzerKey\"")
    } }
    defaultConfig { applicationId = "com.shownext.app"; minSdk = 26; targetSdk = 34; versionCode = 1; versionName = "0.1.0"; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
}
