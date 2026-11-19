// PDF and PowerPoint exports for the Campus Chapter Blueprint. Ported from the old public/chapters.js. The PDF and PPTX files are
// built by hand (no extra npm package); only html2canvas is loaded from a CDN
// the first time someone exports, exactly like the old page.

export type PageImage = { w: number; h: number; b: Uint8Array }

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options: Record<string, unknown>,
    ) => Promise<HTMLCanvasElement>
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 500)
}

function strB(s: string) {
  const u = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i += 1) u[i] = s.charCodeAt(i) & 255
  return u
}

function b64B(b: string) {
  const x = atob(b)
  const u = new Uint8Array(x.length)
  for (let i = 0; i < x.length; i += 1) u[i] = x.charCodeAt(i)
  return u
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(u: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < u.length; i += 1) {
    c = (CRC_TABLE[(c ^ (u[i] ?? 0)) & 255] ?? 0) ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

type PdfObject = string | { a: string; b: Uint8Array; c: string }

export function buildPDF(pages: PageImage[]): Blob {
  const N = pages.length
  const W = 841.89
  const H = 595.28
  const objects: PdfObject[] = []
  objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
  const kids: string[] = []
  for (let i = 0; i < N; i += 1) kids.push(`${3 + i * 3} 0 R`)
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${N} >>\nendobj\n`

  pages.forEach((page, i) => {
    const p = 3 + i * 3
    const c = 4 + i * 3
    const m = 5 + i * 3
    objects[p] = `${p} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${m} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${c} 0 R >>\nendobj\n`
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`
    objects[c] = {
      a: `${c} 0 obj\n<< /Length ${content.length} >>\nstream\n`,
      b: strB(content),
      c: "\nendstream\nendobj\n",
    }
    objects[m] = {
      a: `${m} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.b.length} >>\nstream\n`,
      b: page.b,
      c: "\nendstream\nendobj\n",
    }
  })

  const header = strB("%PDF-1.4\n")
  const chunks: Uint8Array[] = [header]
  const offsets: number[] = []
  let length = header.length
  const total = 3 + 3 * N
  for (let i = 1; i < total; i += 1) {
    offsets[i] = length
    const obj = objects[i]
    if (obj === undefined) throw new Error("PDF object missing")
    if (typeof obj === "string") {
      const bytes = strB(obj)
      chunks.push(bytes)
      length += bytes.length
    } else {
      const head = strB(obj.a)
      const tail = strB(obj.c)
      chunks.push(head, obj.b, tail)
      length += head.length + obj.b.length + tail.length
    }
  }
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`
  for (let i = 1; i < total; i += 1) {
    xref += `${`0000000000${offsets[i] ?? 0}`.slice(-10)} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`
  chunks.push(strB(xref))
  return new Blob(chunks as BlobPart[], { type: "application/pdf" })
}

function zip(files: { name: string; data: Uint8Array }[]): Blob {
  const chunks: Uint8Array[] = []
  const entries: { n: Uint8Array; c: number; s: number; o: number }[] = []
  let offset = 0
  const time = 0x8623
  const date = 0x52a6

  files.forEach((file) => {
    const nameBytes = strB(file.name)
    const data = file.data
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length)
    const v = new DataView(local.buffer)
    v.setUint32(0, 0x04034b50, true)
    v.setUint16(4, 20, true)
    v.setUint16(8, 0, true)
    v.setUint16(10, time, true)
    v.setUint16(12, date, true)
    v.setUint32(14, crc, true)
    v.setUint32(18, data.length, true)
    v.setUint32(22, data.length, true)
    v.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    chunks.push(local, data)
    entries.push({ n: nameBytes, c: crc, s: data.length, o: offset })
    offset += local.length + data.length
  })

  const centralStart = offset
  let centralSize = 0
  entries.forEach((entry) => {
    const h = new Uint8Array(46 + entry.n.length)
    const v = new DataView(h.buffer)
    v.setUint32(0, 0x02014b50, true)
    v.setUint16(4, 20, true)
    v.setUint16(6, 20, true)
    v.setUint16(12, time, true)
    v.setUint16(14, date, true)
    v.setUint32(16, entry.c, true)
    v.setUint32(20, entry.s, true)
    v.setUint32(24, entry.s, true)
    v.setUint16(28, entry.n.length, true)
    v.setUint32(42, entry.o, true)
    h.set(entry.n, 46)
    chunks.push(h)
    centralSize += h.length
  })

  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, centralStart, true)
  chunks.push(end)
  return new Blob(chunks as BlobPart[], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  })
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

export function buildPPTX(pages: PageImage[]): Blob {
  const N = pages.length
  const CX = 10692000
  const CY = 7560000
  const files: { name: string; data: Uint8Array }[] = []
  const add = (name: string, text: string) => files.push({ name, data: strB(text) })

  let contentTypes = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`
  for (let i = 1; i <= N; i += 1) {
    contentTypes += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  }
  contentTypes += "</Types>"
  add("[Content_Types].xml", contentTypes)

  add(
    "_rels/.rels",
    `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
  )

  let presentation = `${XML}<p:presentation xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>`
  for (let i = 1; i <= N; i += 1) {
    presentation += `<p:sldId id="${255 + i}" r:id="rId${i + 1}"/>`
  }
  presentation += `</p:sldIdLst><p:sldSz cx="${CX}" cy="${CY}"/><p:notesSz cx="${CY}" cy="${CX}"/></p:presentation>`
  add("ppt/presentation.xml", presentation)

  let presentationRels = `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/>`
  for (let i = 1; i <= N; i += 1) {
    presentationRels += `<Relationship Id="rId${i + 1}" Type="${REL}/slide" Target="slides/slide${i}.xml"/>`
  }
  presentationRels += "</Relationships>"
  add("ppt/_rels/presentation.xml.rels", presentationRels)

  add(
    "ppt/slideMasters/slideMaster1.xml",
    `${XML}<p:sldMaster xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`,
  )
  add(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="../theme/theme1.xml"/></Relationships>`,
  )
  add(
    "ppt/slideLayouts/slideLayout1.xml",
    `${XML}<p:sldLayout xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
  )
  add(
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
  )
  // Theme colours: navy/gold only (the old file also had a green accent).
  add(
    "ppt/theme/theme1.xml",
    `${XML}<a:theme xmlns:a="${NS_A}" name="FIN"><a:themeElements><a:clrScheme name="FIN"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0A3161"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="F5B927"/></a:accent1><a:accent2><a:srgbClr val="12365E"/></a:accent2><a:accent3><a:srgbClr val="0A3161"/></a:accent3><a:accent4><a:srgbClr val="C89A3C"/></a:accent4><a:accent5><a:srgbClr val="475569"/></a:accent5><a:accent6><a:srgbClr val="E2E8F0"/></a:accent6><a:hlink><a:srgbClr val="0A3161"/></a:hlink><a:folHlink><a:srgbClr val="475569"/></a:folHlink></a:clrScheme><a:fontScheme name="FIN"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="FIN"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
  )

  pages.forEach((page, index) => {
    const i = index + 1
    add(
      `ppt/slides/slide${i}.xml`,
      `${XML}<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id="2" name="Page ${i}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${CX}" cy="${CY}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
    )
    add(
      `ppt/slides/_rels/slide${i}.xml.rels`,
      `${XML}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL}/image" Target="../media/image${i}.jpeg"/></Relationships>`,
    )
    files.push({ name: `ppt/media/image${i}.jpeg`, data: page.b })
  })

  return zip(files)
}

const HTML2CANVAS_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js",
]

function loadScript(url: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = url
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Script failed to load"))
    document.head.appendChild(script)
  })
}

export async function ensureHtml2canvas() {
  if (window.html2canvas) return
  for (const url of HTML2CANVAS_URLS) {
    try {
      await loadScript(url)
      if (window.html2canvas) return
    } catch {
      // Try the next address.
    }
  }
  throw new Error("The page renderer could not be loaded")
}

const nextFrames = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

/** Takes a picture of every blueprint page, one at a time. */
export async function capturePages(options: {
  stage: HTMLElement
  slides: HTMLElement[]
  current: number
  show: (index: number) => void
  onProgress: (index: number, total: number) => void
}): Promise<PageImage[]> {
  const { stage, slides, current, show, onProgress } = options
  const render = window.html2canvas
  if (!render) throw new Error("The page renderer is not ready")
  const originalWidth = stage.style.width
  const originalHeight = stage.style.height
  const pages: PageImage[] = []
  stage.style.width = "1122px"
  stage.style.height = "794px"
  document.body.style.overflow = "visible"
  try {
    for (let i = 0; i < slides.length; i += 1) {
      const slide = slides[i]
      if (!slide) continue
      show(i)
      await nextFrames()
      onProgress(i, slides.length)
      const canvas = await render(slide, {
        scale: 2,
        backgroundColor: "#F8FAFC",
        useCORS: true,
        logging: false,
      })
      pages.push({
        w: canvas.width,
        h: canvas.height,
        b: b64B(canvas.toDataURL("image/jpeg", 0.92).split(",")[1] ?? ""),
      })
      canvas.width = 0
      canvas.height = 0
    }
  } finally {
    stage.style.width = originalWidth
    stage.style.height = originalHeight
    document.body.style.overflow = ""
    show(current)
  }
  return pages
}

