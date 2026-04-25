import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import useProjectStore from '../store/useProjectStore'

/**
 * ProjectDropzone — adapted Dropzone for server-backed project fragment upload.
 *
 * Props:
 *   projectId          {number}   — current project ID
 *   onFragmentUploaded {function} — called with (serverFragment, localData) after upload
 *   disabled           {boolean}  — when true, prevents drop/click (closed projects)
 */
export default function ProjectDropzone({ projectId, onFragmentUploaded, disabled }) {
  const { queue, processFiles } = useBackgroundRemoval()
  const { uploadFragment } = useProjectStore()

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (disabled) return
      const images = acceptedFiles.filter((f) => f.type.startsWith('image/'))
      if (!images.length) return

      // processFiles calls onDone for each file sequentially with local fragment data
      await processFiles(images, async (localData) => {
        try {
          // localData.src is a blob URL — fetch blob for multipart upload
          const res  = await fetch(localData.src)
          const blob = await res.blob()
          // POST processed PNG to server (D-12)
          const serverFragment = await uploadFragment(projectId, blob, localData.name)
          // Notify parent with both server row (has DB id) and local canvas data
          onFragmentUploaded?.(serverFragment, localData)
        } catch (err) {
          console.error('[ProjectDropzone] Upload failed:', err)
        }
      })
    },
    [disabled, processFiles, uploadFragment, projectId, onFragmentUploaded]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    disabled: !!disabled,
  })

  return (
    <aside className="sidebar">
      <div
        className="dropzone"
        {...getRootProps()}
        data-active={isDragActive}
        data-disabled={disabled}
      >
        <input {...getInputProps()} />
        {disabled ? (
          <p className="dz-hint">Project closed — uploads disabled</p>
        ) : isDragActive ? (
          <p className="dz-hint">Відпусти тут</p>
        ) : (
          <>
            <div className="dz-icon">⊕</div>
            <p className="dz-label">Перетягни фото уламків</p>
            <span className="dz-hint">або клікни для вибору</span>
          </>
        )}
      </div>

      {queue.length > 0 && (
        <div className="queue">
          {queue.map((item) => (
            <div key={item.id} className="queue-item" data-status={item.status}>
              <div className="queue-row">
                {item.previewSrc && (
                  <img className="queue-preview" src={item.previewSrc} alt="" />
                )}
                <span className="queue-name">{item.name}</span>
                {item.status === 'done'       && <span className="q-icon ok">✓</span>}
                {item.status === 'error'      && <span className="q-icon err">✗</span>}
                {item.status === 'processing' && <span className="q-icon spin">◌</span>}
              </div>
              {item.status === 'processing' && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
