// components/AvatarUploader.jsx
// Professional avatar picker: choose a file → crop/zoom in a modal → upload.
// Uses a canvas to crop to a square, so what the user sees is what gets saved.
// No external cropping library — works in any Vite build.
import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function AvatarUploader({ T, currentPhoto, name, onUploaded }) {
  const [file, setFile] = useState(null)          // selected raw image (dataURL)
  const [showCrop, setShowCrop] = useState(false)
  const fileRef = useRef()

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.error('Please choose an image file.')
    if (f.size > 8 * 1024 * 1024) return toast.error('Image is too large (max 8MB).')
    const reader = new FileReader()
    reader.onload = () => { setFile(reader.result); setShowCrop(true) }
    reader.readAsDataURL(f)
    e.target.value = '' // allow re-picking same file
  }

  const initials = (name || '').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()

  return (
    <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
      {/* Current avatar */}
      <div style={{ position:'relative' }}>
        <div style={{
          width:84, height:84, borderRadius:'50%', overflow:'hidden', flexShrink:0,
          background: currentPhoto ? `url(${currentPhoto}) center/cover` : `linear-gradient(135deg,${T.accent},${T.violet})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontSize:28, fontWeight:800, border:`3px solid ${T.surface}`, boxShadow:T.shadowMd,
        }}>
          {!currentPhoto && initials}
        </div>
        <button type="button" onClick={()=>fileRef.current.click()} title="Change photo" style={{
          position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:'50%',
          background:T.accent, border:`2px solid ${T.surface}`, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, padding:0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
      </div>

      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:T.text, marginBottom:3 }}>Profile photo</div>
        <div style={{ fontSize:12, color:T.text3, marginBottom:10, lineHeight:1.5 }}>PNG or JPG. You can zoom and reposition before saving.</div>
        <div style={{ display:'flex', gap:8 }}>
          <button type="button" onClick={()=>fileRef.current.click()} style={{
            padding:'8px 14px', borderRadius:9, border:`1px solid ${T.border}`, background:T.surface, color:T.text, fontSize:12.5, fontWeight:700, cursor:'pointer',
          }}>Upload new</button>
          {currentPhoto && (
            <button type="button" onClick={()=>onUploaded('')} style={{
              padding:'8px 14px', borderRadius:9, border:`1px solid ${T.border}`, background:T.surface, color:T.red, fontSize:12.5, fontWeight:700, cursor:'pointer',
            }}>Remove</button>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={pick} />

      {showCrop && (
        <CropModal T={T} src={file} onCancel={()=>setShowCrop(false)}
          onDone={(url)=>{ setShowCrop(false); onUploaded(url) }} />
      )}
    </div>
  )
}

// ── Crop modal: drag to reposition, slider to zoom, circular mask ──
function CropModal({ T, src, onCancel, onDone }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x:0, y:0 })
  const [uploading, setUploading] = useState(false)
  const dragRef = useRef(null)
  const imgRef = useRef(null)
  const boxSize = 260  // on-screen crop circle diameter

  const onPointerDown = (e) => {
    const start = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    dragRef.current = start
    const move = (ev) => {
      if (!dragRef.current) return
      setOffset({ x: dragRef.current.ox + (ev.clientX - dragRef.current.x), y: dragRef.current.oy + (ev.clientY - dragRef.current.y) })
    }
    const up = () => { dragRef.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Render the cropped circle to a canvas and upload
  const save = useCallback(async () => {
    const img = imgRef.current
    if (!img) return
    setUploading(true)
    try {
      const out = 512 // exported size
      const canvas = document.createElement('canvas')
      canvas.width = out; canvas.height = out
      const ctx = canvas.getContext('2d')

      // The displayed image dimensions inside the box
      const natural = Math.min(img.naturalWidth, img.naturalHeight)
      const baseScale = boxSize / natural         // scale to fit short side into box
      const scale = baseScale * zoom
      const dispW = img.naturalWidth * scale
      const dispH = img.naturalHeight * scale

      // Top-left of the image relative to the box (box is centered origin)
      const imgLeft = (boxSize - dispW)/2 + offset.x
      const imgTop  = (boxSize - dispH)/2 + offset.y

      // Map box → output scale
      const k = out / boxSize
      ctx.save()
      ctx.beginPath()
      ctx.arc(out/2, out/2, out/2, 0, Math.PI*2)
      ctx.clip()
      ctx.drawImage(img, imgLeft*k, imgTop*k, dispW*k, dispH*k)
      ctx.restore()

      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9))
      const fd = new FormData()
      fd.append('file', blob, 'avatar.jpg')
      const { data } = await axios.post(`${API}/upload/photo`, fd, { headers:{'Content-Type':'multipart/form-data'} })
      toast.success('Photo updated.')
      onDone(data.url)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.')
    } finally { setUploading(false) }
  }, [zoom, offset, onDone])

  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:T.overlay, display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.surface, borderRadius:16, width:'100%', maxWidth:360, boxShadow:T.shadowMd, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:15, fontWeight:800, color:T.text }}>Adjust photo</span>
          <button onClick={onCancel} style={{ background:'none', border:'none', fontSize:22, color:T.text3, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:20 }}>
          {/* Crop area */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
            <div onPointerDown={onPointerDown} style={{
              width:boxSize, height:boxSize, borderRadius:'50%', overflow:'hidden', position:'relative',
              cursor:'grab', background:T.surface2, touchAction:'none', border:`2px solid ${T.border}`,
            }}>
              <img ref={imgRef} src={src} alt="crop" draggable={false} style={{
                position:'absolute', left:'50%', top:'50%',
                transform:`translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                transformOrigin:'center',
                minWidth:'100%', minHeight:'100%',
                width: boxSize, height:'auto',
                userSelect:'none', pointerEvents:'none',
              }} />
              {/* ring hint */}
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', boxShadow:`inset 0 0 0 2px rgba(255,255,255,0.5)` }}/>
            </div>
          </div>

          {/* Zoom slider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <span style={{ fontSize:16, color:T.text3 }}>−</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))}
              style={{ flex:1, accentColor:T.accent }} />
            <span style={{ fontSize:18, color:T.text3 }}>+</span>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:'11px', borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, color:T.text2, fontSize:13.5, fontWeight:700, cursor:'pointer' }}>Cancel</button>
            <button onClick={save} disabled={uploading} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background: uploading?T.text3:T.accent, color:'#fff', fontSize:13.5, fontWeight:700, cursor: uploading?'default':'pointer' }}>{uploading?'Saving…':'Save photo'}</button>
          </div>
          <p style={{ fontSize:11, color:T.text3, textAlign:'center', margin:'12px 0 0' }}>Drag to reposition · slider to zoom</p>
        </div>
      </div>
    </div>
  )
}