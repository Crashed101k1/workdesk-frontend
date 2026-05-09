import React from 'react'
import '../styles/toolhub.css'

const TOOL_CATEGORIES = [
  {
    id: 'docs',
    title: 'Gestión de Documentos',
    icon: '📄',
    tools: [
      {
        id: 'ilovepdf',
        name: 'iLovePDF',
        domain: 'ilovepdf.com',
        desc: 'Herramientas online y completamente gratuitas para unir PDF, separar PDF, comprimir PDF, convertir documentos Office a PDF, PDF a JPG y JPG a PDF.',
        url: 'https://www.ilovepdf.com',
        logoImg: 'https://www.ilovepdf.com/img/ilovepdf.svg',
        imgClass: 'contain'
      },
      {
        id: 'googledocs',
        name: 'Google Docs',
        domain: 'docs.google.com',
        desc: 'Crea, edita y colabora en documentos de texto en línea en tiempo real desde cualquier dispositivo.',
        url: 'https://docs.google.com',
        logoImg: 'https://www.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png',
        imgClass: 'contain'
      }
    ]
  },
  {
    id: 'design',
    title: 'Diseño y Creatividad',
    icon: '🎨',
    tools: [
      {
        id: 'canva',
        name: 'Canva',
        domain: 'canva.com',
        desc: 'Plataforma de diseño gráfico fácil de usar. Ideal para crear presentaciones, posts para redes sociales y pósteres.',
        url: 'https://www.canva.com',
        logoImg: 'https://www.google.com/s2/favicons?domain=canva.com&sz=128',
        imgClass: 'contain'
      },
      {
        id: 'excalidraw',
        name: 'Excalidraw',
        domain: 'excalidraw.com',
        desc: 'Pizarra virtual interactiva que permite dibujar diagramas esquemáticos con un estilo de trazado a mano.',
        url: 'https://excalidraw.com',
        logoImg: 'https://www.google.com/s2/favicons?domain=excalidraw.com&sz=128',
        imgClass: 'contain'
      }
    ]
  },
  {
    id: 'utilities',
    title: 'Utilidades',
    icon: '⚙️',
    tools: [
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        domain: 'chatgpt.com',
        desc: 'Asistente de inteligencia artificial útil para redacción, programación, análisis y lluvia de ideas.',
        url: 'https://chatgpt.com',
        logoImg: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128',
        imgClass: 'contain'
      },
      {
        id: 'notion',
        name: 'Notion',
        domain: 'notion.so',
        desc: 'Espacio de trabajo todo en uno. Escribe, planifica y organízate en un solo lugar.',
        url: 'https://www.notion.so',
        logoImg: 'https://www.google.com/s2/favicons?domain=notion.so&sz=128',
        imgClass: 'contain'
      }
    ]
  },
  {
    id: 'management',
    title: 'Organización y Proyectos',
    icon: '📊',
    tools: [
      {
        id: 'trello',
        name: 'Trello',
        domain: 'trello.com',
        desc: 'Herramienta visual de gestión de proyectos basada en tableros Kanban, listas y tarjetas.',
        url: 'https://trello.com',
        logoImg: 'https://www.google.com/s2/favicons?domain=trello.com&sz=128',
        imgClass: 'contain'
      },
      {
        id: 'asana',
        name: 'Asana',
        domain: 'asana.com',
        desc: 'Gestiona el trabajo, los proyectos y las tareas de tu equipo en una plataforma centralizada.',
        url: 'https://asana.com',
        logoImg: 'https://www.google.com/s2/favicons?domain=asana.com&sz=128',
        imgClass: 'contain'
      }
    ]
  },
  {
    id: 'development',
    title: 'Desarrollo y Código',
    icon: '💻',
    tools: [
      {
        id: 'github',
        name: 'GitHub',
        domain: 'github.com',
        desc: 'Plataforma de alojamiento de código y colaboración líder mundial para desarrolladores.',
        url: 'https://github.com',
        logoImg: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
        imgClass: 'contain'
      },
      {
        id: 'stackoverflow',
        name: 'Stack Overflow',
        domain: 'stackoverflow.com',
        desc: 'Comunidad pública y plataforma de preguntas y respuestas imprescindible para programadores.',
        url: 'https://stackoverflow.com',
        logoImg: 'https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=128',
        imgClass: 'contain'
      }
    ]
  }
]

export default function ToolHub({ onBack }) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeFilter, setActiveFilter] = React.useState('all')

  const filteredCategories = TOOL_CATEGORIES.map(cat => {
    const filteredTools = cat.tools.filter(tool => {
      const query = searchQuery.toLowerCase()
      const matchesSearch = tool.name.toLowerCase().includes(query) || 
                            tool.desc.toLowerCase().includes(query)
      return matchesSearch
    })
    return { ...cat, tools: filteredTools }
  }).filter(cat => {
    if (activeFilter !== 'all' && cat.id !== activeFilter) return false
    return cat.tools.length > 0
  })

  return (
    <div className="toolhub-page">
      <div className="toolhub-container">
        
        {/* Header */}
        <div className="toolhub-header">
          <div className="toolhub-header-left">
            <button className="btn btn-outline-light" onClick={onBack}>
              ← Volver al Dashboard
            </button>
            <h1 className="toolhub-title">ToolHub</h1>
          </div>
          
          <div className="toolhub-search-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              className="toolhub-search" 
              placeholder="Buscar herramientas..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="toolhub-filters">
          <div className="toolhub-chips">
            <button 
              className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todas
            </button>
            {TOOL_CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                className={`filter-chip ${activeFilter === cat.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(cat.id)}
              >
                <span style={{fontSize:'16px'}}>{cat.icon}</span> {cat.title}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.5)' }}>
            No se encontraron herramientas que coincidan con tu búsqueda.
          </div>
        ) : (
          filteredCategories.map((category, idx) => (
            <div 
              key={category.id} 
              className="category-section"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <h2 className="category-title">
                <span className="category-icon">{category.icon}</span>
                {category.title}
              </h2>
              
              <div className="tools-grid">
                {category.tools.map(tool => (
                  <div 
                    key={tool.id} 
                    onClick={() => {
                      // Se abre en una ventana popup con dimensiones específicas para simular que no sales de la app
                      const width = Math.min(1200, window.screen.width * 0.9);
                      const height = Math.min(800, window.screen.height * 0.9);
                      const left = (window.screen.width - width) / 2;
                      const top = (window.screen.height - height) / 2;
                      window.open(
                        tool.url, 
                        `tool_${tool.id}`, 
                        `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
                      );
                    }}
                    className="tool-card"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="tool-header">
                      <div className="tool-logo-wrap">
                        {tool.logoImg ? (
                          <img 
                            src={tool.logoImg} 
                            alt={tool.name} 
                            className={`tool-logo-img ${tool.imgClass || ''}`} 
                          />
                        ) : (
                          <span>{tool.logoEmoji}</span>
                        )}
                      </div>
                      <div className="tool-info">
                        <h3 className="tool-name">{tool.name}</h3>
                        <p className="tool-domain">{tool.domain}</p>
                      </div>
                    </div>
                    <p className="tool-desc">{tool.desc}</p>
                    
                    <div className="tool-footer">
                      <div /> {/* Spacer */}
                      <div className="tool-open-btn">
                        Abrir App
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  )
}
