import sharp from "sharp";

export interface BrandingConfig {
  brandLogo?: string | null;
  addCenterWatermark?: boolean;
  brandName?: string;
  designNumber?: string;
  fontSize?: number; // percentage of image width, e.g. 4.0
  isBold?: boolean;
  fontColor?: "dark" | "white";
  textPosition?: "top_left" | "top_right" | "bottom_left" | "bottom_right";
}

function escapeSvgXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

/**
 * Applies branding details (logo watermark and text labels) onto an image buffer using Sharp.
 */
export async function applyBrandingToImageBuffer(buffer: Buffer, config: BrandingConfig): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    const composites: sharp.OverlayOptions[] = [];

    // 1. Fetch brand logo if present
    let logoBuffer: Buffer | null = null;
    if (config.brandLogo && config.brandLogo.startsWith("http")) {
      try {
        const logoRes = await fetch(config.brandLogo);
        if (logoRes.ok) {
          logoBuffer = Buffer.from(await logoRes.arrayBuffer());
        } else {
          console.warn(`Failed to fetch logo: HTTP ${logoRes.status}`);
        }
      } catch (err) {
        console.error("Error fetching brand logo watermark:", err);
      }
    }

    // 2. Add Center Watermark if requested
    if (logoBuffer && config.addCenterWatermark) {
      try {
        const watermarkWidth = Math.round(width * 0.35); // 35% of image width
        
        let mimeType = "image/png";
        if (logoBuffer[0] === 0xff && logoBuffer[1] === 0xd8) {
          mimeType = "image/jpeg";
        } else if (logoBuffer[0] === 0x47 && logoBuffer[1] === 0x49) {
          mimeType = "image/gif";
        } else if (logoBuffer[0] === 0x52 && logoBuffer[1] === 0x49 && logoBuffer[2] === 0x46 && logoBuffer[3] === 0x46) {
          mimeType = "image/webp";
        }
        
        const logoBase64 = logoBuffer.toString("base64");
        const logoDataUri = `data:${mimeType};base64,${logoBase64}`;

        const logoMeta = await sharp(logoBuffer).metadata();
        const logoW = logoMeta.width || 100;
        const logoH = logoMeta.height || 100;
        const aspect = logoH / logoW;
        const watermarkHeight = Math.round(watermarkWidth * aspect);

        const watermarkX = Math.round((width - watermarkWidth) / 2);
        const watermarkY = Math.round((height - watermarkHeight) / 2);

        const watermarkSvg = `
          <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <image href="${logoDataUri}" x="${watermarkX}" y="${watermarkY}" width="${watermarkWidth}" height="${watermarkHeight}" opacity="0.15" />
          </svg>
        `;

        composites.push({
          input: Buffer.from(watermarkSvg),
          top: 0,
          left: 0,
        });
      } catch (err) {
        console.error("Error creating center watermark overlay:", err);
      }
    }

    // 3. Build Corner Branding (SVG Overlay)
    const margin = Math.round(width * 0.04); // 4% margin
    const sizePct = config.fontSize || 4.0;
    const fontSizePx = Math.round(width * (sizePct / 100));
    const logoSize = Math.round(fontSizePx * 1.5);
    
    const textPosition = config.textPosition || "top_right";
    const isRight = textPosition === "top_right" || textPosition === "bottom_right";
    const isBottom = textPosition === "bottom_left" || textPosition === "bottom_right";
    const textAnchor = isRight ? "end" : "start";

    const hasCornerLogo = logoBuffer && !config.addCenterWatermark;
    const hasBrandName = !!config.brandName && config.brandName.trim() !== "";
    const hasDesignNo = !!config.designNumber && config.designNumber.trim() !== "";

    // If there is anything to render in the corner
    if (hasCornerLogo || hasBrandName || hasDesignNo) {
      let totalHeight = 0;
      if (hasCornerLogo) {
        totalHeight += logoSize + 10;
      }
      if (hasBrandName) {
        totalHeight += fontSizePx;
      }
      if (hasDesignNo) {
        totalHeight += (hasBrandName ? fontSizePx * 1.2 : fontSizePx);
      }

      let currentY = isBottom ? height - margin - totalHeight : margin;
      let svgContent = "";

      // Add Corner Logo
      if (hasCornerLogo && logoBuffer) {
        const logoX = isRight ? width - margin - logoSize : margin;
        
        let mimeType = "image/png";
        if (logoBuffer[0] === 0xff && logoBuffer[1] === 0xd8) {
          mimeType = "image/jpeg";
        } else if (logoBuffer[0] === 0x47 && logoBuffer[1] === 0x49) {
          mimeType = "image/gif";
        } else if (logoBuffer[0] === 0x52 && logoBuffer[1] === 0x49 && logoBuffer[2] === 0x46 && logoBuffer[3] === 0x46) {
          mimeType = "image/webp";
        }
        
        const logoBase64 = logoBuffer.toString("base64");
        const logoDataUri = `data:${mimeType};base64,${logoBase64}`;
        
        svgContent += `<image href="${logoDataUri}" x="${logoX}" y="${currentY}" width="${logoSize}" height="${logoSize}" />`;
        currentY += logoSize + 10;
      }

      const filterAttr = config.fontColor === "dark" ? 'filter="url(#white-shadow)"' : 'filter="url(#shadow)"';
      const fontColor = config.fontColor === "dark" ? "#111827" : "#ffffff";
      const fontWeight = config.isBold !== false ? "bold" : "normal";

      // Add Brand Name
      if (hasBrandName) {
        const textX = isRight ? width - margin : margin;
        const textY = currentY + fontSizePx * 0.85;
        svgContent += `
          <text 
            x="${textX}" 
            y="${textY}" 
            font-family="sans-serif, Inter" 
            font-size="${fontSizePx}px" 
            font-weight="${fontWeight}" 
            fill="${fontColor}" 
            text-anchor="${textAnchor}"
            ${filterAttr}
          >
            ${escapeSvgXml(config.brandName || "")}
          </text>
        `;
        currentY += fontSizePx * 1.2;
      }

      // Add Design Number
      if (hasDesignNo) {
        const textX = isRight ? width - margin : margin;
        const textY = currentY + fontSizePx * 0.85;
        svgContent += `
          <text 
            x="${textX}" 
            y="${textY}" 
            font-family="sans-serif, Inter" 
            font-size="${Math.round(fontSizePx * 0.8)}px" 
            font-weight="normal" 
            fill="${fontColor}" 
            text-anchor="${textAnchor}"
            ${filterAttr}
            opacity="0.9"
          >
            ${escapeSvgXml(config.designNumber || "")}
          </text>
        `;
      }

      const svgOverlay = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
            </filter>
            <filter id="white-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#ffffff" flood-opacity="0.6"/>
            </filter>
          </defs>
          ${svgContent}
        </svg>
      `;

      composites.push({
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      });
    }

    if (composites.length > 0) {
      return await image.composite(composites).toBuffer();
    }

    return buffer;
  } catch (error) {
    console.error("Branding overlay processing failed, returning original image:", error);
    return buffer;
  }
}

/**
 * Fetches an image URL, applies branding details onto it, and returns the modified Buffer.
 */
export async function applyBrandingToUrl(url: string, config: BrandingConfig): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from URL: ${url}, status ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return applyBrandingToImageBuffer(buffer, config);
}
