// Version matrix (probed June 2026 — keep these in lock-step):
//   Kotlin 2.1.21  +  KSP 2.1.21-2.0.2  +  Micronaut application plugin 4.6.2
// Newer Kotlin (2.4.0) has no matching KSP release yet, which is why we pin here.
plugins {
    kotlin("jvm") version "2.1.21"
    kotlin("plugin.allopen") version "2.1.21"
    id("com.google.devtools.ksp") version "2.1.21-2.0.2"
    id("io.micronaut.application") version "4.6.2"
    // Fat ("uber") jar for the Docker image — the application plugin does NOT bundle deps
    // itself; `runnerJar` is a thin jar. Shadow provides the standalone build/libs/*-all.jar
    // the Dockerfile copies. Pinned to 8.3.x to match the Micronaut 4.6.x integration.
    id("com.gradleup.shadow") version "8.3.11"
}

version = "0.1.0"
group = "com.ktb.shop"

repositories {
    mavenCentral()
}

dependencies {
    // annotation processors (KSP)
    ksp("io.micronaut:micronaut-http-validation")
    ksp("io.micronaut.data:micronaut-data-processor")
    ksp("io.micronaut.serde:micronaut-serde-processor")
    ksp("io.micronaut.validation:micronaut-validation-processor")
    // OpenAPI: the processor reads @OpenAPIDefinition/@Operation/@Schema at build time and
    // emits the spec (build/.../META-INF/swagger/*.yml) + the bundled UI HTML. Version is
    // managed by the Micronaut 4.6 platform BOM — leave it unpinned to stay in lock-step.
    ksp("io.micronaut.openapi:micronaut-openapi")

    // runtime
    implementation("io.micronaut:micronaut-http-server-netty")
    implementation("io.micronaut:micronaut-management")
    implementation("io.micronaut.kotlin:micronaut-kotlin-runtime")
    implementation("io.micronaut.serde:micronaut-serde-jackson")
    implementation("io.micronaut.validation:micronaut-validation")
    implementation("io.micronaut.data:micronaut-data-jdbc")
    implementation("io.micronaut.sql:micronaut-jdbc-hikari")
    implementation("io.micronaut.flyway:micronaut-flyway")
    // Swagger annotations used in controllers/DTOs (@Operation, @Schema, @ApiResponse, …).
    implementation("io.swagger.core.v3:swagger-annotations")
    implementation("org.jetbrains.kotlin:kotlin-stdlib")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("ch.qos.logback:logback-classic")
    runtimeOnly("org.yaml:snakeyaml")

    // tests
    testImplementation("io.micronaut.test:micronaut-test-junit5")
    testImplementation("io.micronaut:micronaut-http-client")
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.4"))
    testImplementation("org.testcontainers:postgresql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

application {
    mainClass = "com.ktb.shop.ApplicationKt"
}

java {
    sourceCompatibility = JavaVersion.toVersion("21")
}

kotlin {
    jvmToolchain(21)
}

micronaut {
    runtime("netty")
    testRuntime("junit5")
    processing {
        incremental(true)
        annotations("com.ktb.shop.*")
    }
}

// Tell the OpenAPI KSP processor to also render the interactive UIs. It bundles the assets
// into META-INF/swagger/views/** at build time, so the docs work fully offline (no CDN).
ksp {
    arg("micronaut.openapi.views.spec", "swagger-ui.enabled=true,redoc.enabled=true,rapidoc.enabled=true")
}
