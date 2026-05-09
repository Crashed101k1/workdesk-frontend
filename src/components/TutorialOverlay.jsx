import React, { useState } from 'react'
import '../styles/tutorial.css'

const SLIDES = [
  {
    id: 1,
    title: '¡Bienvenido a WorkDesk!',
    desc: 'Tu nuevo espacio de trabajo personal. Aquí podrás organizar tu tiempo, tus tareas y tu creatividad en un lienzo totalmente libre y personalizable.',
    icon: '/media/Logo_WorkDesk-removebg-preview.png',
    isImage: true,
    highlight: '¡Comencemos un breve recorrido!'
  },
  {
    id: 2,
    title: 'Añade Módulos a tu Gusto',
    desc: 'Utiliza el menú superior izquierdo para agregar Pomodoros, Tareas, Notas, Música y más. Arrástralos, cambia su tamaño y organízalos como tú quieras.',
    icon: '➕',
    isImage: false,
    highlight: 'Tip: Fija tus favoritos con la tachuela 📌'
  },
  {
    id: 3,
    title: 'Descubre el ToolHub',
    desc: '¿Necesitas herramientas potentes? En la esquina superior derecha encontrarás el botón ToolHub. Desde allí podrás acceder a aplicaciones avanzadas sin salir del escritorio.',
    icon: '🛠️',
    isImage: false,
    highlight: 'Herramientas enfocadas en productividad'
  },
  {
    id: 4,
    title: 'Tu Perfil y Sincronización',
    desc: 'Al hacer clic en tu foto de perfil podrás cambiar tu fondo, subir un avatar o modificar tu contraseña. ¡Todo tu escritorio se guarda automáticamente en la nube!',
    icon: '☁️',
    isImage: false,
    highlight: '¡Estás listo para trabajar sin límites!'
  }
]

export default function TutorialOverlay({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  
  const slide = SLIDES[currentSlide]
  const isLast = currentSlide === SLIDES.length - 1

  const nextSlide = () => {
    if (isLast) {
      onComplete()
    } else {
      setCurrentSlide(s => s + 1)
    }
  }

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        
        <div key={slide.id} className="tutorial-content slide-enter">
          <div className="tutorial-icon" style={slide.isImage ? { background: 'none' } : { fontSize: '40px' }}>
            {slide.isImage ? (
              <img src={slide.icon} alt="Icon" />
            ) : (
              slide.icon
            )}
          </div>
          
          <h2 className="tutorial-title">{slide.title}</h2>
          <p className="tutorial-desc">{slide.desc}</p>
          
          <div className="tutorial-highlight">
            {slide.highlight}
          </div>
        </div>

        <div className="tutorial-footer">
          <div className="tutorial-dots">
            {SLIDES.map((s, idx) => (
              <div 
                key={s.id} 
                className={`dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
          
          <div className="tutorial-actions">
            {!isLast && (
              <button className="btn-skip" onClick={onComplete}>
                Omitir
              </button>
            )}
            <button className="btn-next" onClick={nextSlide}>
              {isLast ? '¡Comenzar!' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
