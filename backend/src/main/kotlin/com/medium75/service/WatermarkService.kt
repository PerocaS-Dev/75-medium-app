package com.medium75.service

import org.springframework.stereotype.Service
import java.awt.AlphaComposite
import java.awt.Color
import java.awt.Font
import java.awt.RenderingHints
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

@Service
class WatermarkService {

    fun apply(imageBytes: ByteArray, contentType: String, viewerName: String): ByteArray {
        val image = ImageIO.read(ByteArrayInputStream(imageBytes))
            ?: error("Could not decode image")

        val g = image.createGraphics()
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON)

        val fontSize = (image.width * 0.03).coerceIn(16.0, 36.0).toFloat()
        g.font = Font("SansSerif", Font.BOLD, fontSize.toInt())
        val metrics = g.getFontMetrics()
        val text = viewerName
        val margin = 16
        val x = image.width - metrics.stringWidth(text) - margin
        val y = image.height - margin

        // shadow
        g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.6f)
        g.color = Color.BLACK
        g.drawString(text, x + 2, y + 2)

        // text
        g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.85f)
        g.color = Color.WHITE
        g.drawString(text, x, y)

        g.dispose()

        val format = if (contentType.contains("png", ignoreCase = true)) "PNG" else "JPEG"
        val out = ByteArrayOutputStream()
        ImageIO.write(image, format, out)
        return out.toByteArray()
    }
}
