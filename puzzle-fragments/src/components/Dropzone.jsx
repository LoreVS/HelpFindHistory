import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import useFragmentStore from '../store/useFragmentStore'

export default function Dropzone() {
  const { queue, processFiles } = useBackgroundRemoval()
  const { addFragment, fragments, removeFragment, clearAll } = useFragmentStore()

  const onDrop = useCallback(
    (acceptedFiles) => {
      const images = acceptedFiles.filter((f) => f.type.startsWith('image/'))
      if (images.length) processFiles(images, addFragment)
    },
    [processFiles, addFragment]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  })

  return (
    <aside className="sidebar">
      <div className="dropzone" {...getRootProps()} data-active={isDragActive}>
        <input {...getInputProps()} />
        {isDragActive ? (
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
                {/* Показуємо оригінал поки обробляємо */}
                {item.previewSrc && (
                  <img className="queue-preview" src={item.previewSrc} alt="" />
                )}
                <span className="queue-name">{item.name}</span>
                {item.status === 'done' && <span className="q-icon ok">✓</span>}
                {item.status === 'error' && <span className="q-icon err">✗</span>}
                {item.status === 'processing' && (
                  <span className="q-icon spin">◌</span>
                )}
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

      {fragments.length > 0 && (
        <div className="frag-list">
          <div className="frag-header">
            <span className="frag-count">{fragments.length} уламків</span>
            <button className="btn-clear" onClick={clearAll}>
              Очистити все
            </button>
          </div>
          {fragments.map((f) => (
            <div key={f.id} className="frag-thumb">
              {/* previewSrc — оригінал, src — з прозорим фоном */}
              <img
                src={f.previewSrc || f.src}
                alt={f.name}
                onError={(e) => { e.target.src = f.src }}
              />
              <div className="frag-thumb-overlay">
                <span className="frag-thumb-name">{f.name}</span>
              </div>
              <button className="btn-remove" onClick={() => removeFragment(f.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {fragments.length === 0 && queue.length === 0 && (
        <p className="sidebar-tip">
          Завантаж зображення уламків — фон буде автоматично видалено,
          а уламки з'являться на канвасі.
        </p>
      )}
    </aside>
  )
}