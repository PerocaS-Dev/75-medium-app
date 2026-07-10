package com.medium75.config

import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.resource.PathResourceResolver

/**
 * Single-page-app fallback: serve the built React index.html for any route that
 * isn't an API call or an existing static file. Without this, refreshing or opening
 * a client-side route directly (e.g. /login or /dashboard) makes the browser request
 * that path from the server, which has no such static resource and 500s.
 *
 * REST controllers are matched by a higher-precedence handler, so api routes are never
 * affected; unknown api paths still 404 (guarded below) rather than returning HTML.
 */
@Configuration
class SpaWebConfig : WebMvcConfigurer {
    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(object : PathResourceResolver() {
                override fun getResource(resourcePath: String, location: Resource): Resource? {
                    if (resourcePath.startsWith("api/")) return null
                    val requested = location.createRelative(resourcePath)
                    return if (requested.exists() && requested.isReadable) requested
                    else ClassPathResource("static/index.html")
                }
            })
    }
}
