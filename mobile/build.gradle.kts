plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.google.services) apply false
}

// Regla del proyecto (CONTRIBUTING.md): ningún .kt/.kts pasa de 200 líneas físicas.
val checkFileLength by tasks.registering {
    group = "verification"
    description = "Falla si algún .kt/.kts supera 200 líneas físicas."
    val root = rootDir
    val sources = fileTree(root) {
        include("**/*.kt", "**/*.kts")
        exclude("**/build/**", "**/.gradle/**", "**/.kotlin/**")
    }
    val marker = layout.buildDirectory.file("checkFileLength.ok")
    inputs.files(sources)
    outputs.file(marker)
    doLast {
        val limit = 200
        val offenders = sources.files.map { it to it.readLines().size }.filter { it.second > limit }
        if (offenders.isNotEmpty()) throw GradleException(
            offenders.joinToString("\n", "Archivos con más de $limit líneas (ver CONTRIBUTING.md):\n") { (f, n) ->
                " - ${f.relativeTo(root)}: $n"
            }
        )
        marker.get().asFile.apply { parentFile.mkdirs() }.writeText("ok")
    }
}
