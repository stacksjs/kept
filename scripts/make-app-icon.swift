// The Library app icon: a deep indigo squircle with three books on a shelf, the
// last one leaning. Drawn with CoreGraphics so the 1024 pixel master is made by
// a script and can be changed by editing numbers, not a design file.
//
//   swift scripts/make-app-icon.swift resources/native/icon/AppIcon-1024.png
import AppKit

let size: CGFloat = 1024
let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "AppIcon-1024.png"
let space = CGColorSpace(name: CGColorSpace.sRGB)!
guard let context = CGContext(data: nil, width: Int(size), height: Int(size), bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fatalError("no context") }

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: space, components: [CGFloat((hex >> 16) & 255) / 255, CGFloat((hex >> 8) & 255) / 255, CGFloat(hex & 255) / 255, alpha])!
}

// macOS icons keep a margin inside the canvas: the squircle is 824 points.
let tile = CGRect(x: 100, y: 100, width: 824, height: 824)
let radius: CGFloat = 186
let tilePath = CGPath(roundedRect: tile, cornerWidth: radius, cornerHeight: radius, transform: nil)

// Soft drop shadow under the tile.
context.saveGState()
context.setShadow(offset: CGSize(width: 0, height: -14), blur: 28, color: color(0x000000, 0.28))
context.addPath(tilePath); context.setFillColor(color(0x1b2a6b)); context.fillPath()
context.restoreGState()

// Tile gradient, light at the top.
context.saveGState()
context.addPath(tilePath); context.clip()
let gradient = CGGradient(colorsSpace: space, colors: [color(0x4f6df0), color(0x24349a), color(0x172266)] as CFArray, locations: [0, 0.55, 1])!
context.drawLinearGradient(gradient, start: CGPoint(x: 512, y: 924), end: CGPoint(x: 512, y: 100), options: [])
// A faint highlight along the upper edge.
let sheen = CGGradient(colorsSpace: space, colors: [color(0xffffff, 0.22), color(0xffffff, 0)] as CFArray, locations: [0, 1])!
context.drawLinearGradient(sheen, start: CGPoint(x: 512, y: 924), end: CGPoint(x: 512, y: 640), options: [])
context.restoreGState()

// The shelf.
let shelfY: CGFloat = 318
let shelf = CGRect(x: 214, y: shelfY - 26, width: 596, height: 26)
context.addPath(CGPath(roundedRect: shelf, cornerWidth: 13, cornerHeight: 13, transform: nil))
context.setFillColor(color(0xffffff, 0.92)); context.fillPath()

// Books: x, width, height, fill.
let books: [(CGFloat, CGFloat, CGFloat, UInt32)] = [
    (238, 116, 372, 0xffffff),
    (372, 100, 432, 0xdfe6ff),
    (490, 124, 336, 0xb7c4ff),
]
for (x, width, height, fill) in books {
    let rect = CGRect(x: x, y: shelfY, width: width, height: height)
    context.addPath(CGPath(roundedRect: rect, cornerWidth: 14, cornerHeight: 14, transform: nil))
    context.setFillColor(color(fill, 0.97)); context.fillPath()
    // Two spine bands.
    for fraction in [0.78, 0.7] as [CGFloat] {
        context.setFillColor(color(0x24349a, 0.28))
        context.fill(CGRect(x: x, y: shelfY + height * fraction, width: width, height: 9))
    }
}

// The last book leans against the others.
context.saveGState()
context.translateBy(x: 664, y: shelfY)
context.rotate(by: -0.2)
let leaning = CGRect(x: 0, y: 0, width: 108, height: 388)
context.addPath(CGPath(roundedRect: leaning, cornerWidth: 14, cornerHeight: 14, transform: nil))
context.setFillColor(color(0x8fa3ff, 0.98)); context.fillPath()
context.setFillColor(color(0x24349a, 0.28)); context.fill(CGRect(x: 0, y: 388 * 0.78, width: 108, height: 9))
context.restoreGState()

guard let image = context.makeImage() else { fatalError("no image") }
let rep = NSBitmapImageRep(cgImage: image)
guard let data = rep.representation(using: .png, properties: [:]) else { fatalError("no png") }
try data.write(to: URL(fileURLWithPath: output))
print("wrote \(output)")
