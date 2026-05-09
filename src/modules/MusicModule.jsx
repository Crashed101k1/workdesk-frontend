import React, { useState, useEffect } from 'react'
import '../styles/musicModule.css'
import { musicAPI } from '../services/api'

const STATIONS = [
  { id: 'lofi',    label: 'Lofi Girl',     icon: '🎧', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { id: 'synth',   label: 'Synthwave',     icon: '🚀', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { id: 'rain',    label: 'Deep Rain',     icon: '🌧️', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' },
  { id: 'jazz',    label: 'Coffee Jazz',   icon: '☕', url: 'https://www.youtube.com/watch?v=1W5BA09I_xM' },
  { id: 'classic', label: 'Classical',     icon: '🎻', url: 'https://www.youtube.com/watch?v=77ZozI0rw7w' },
  { id: 'nature',  label: 'Forest',        icon: '🍃', url: 'https://www.youtube.com/watch?v=n-S6pAUPn8o' },
]

export default function MusicModule({ data = {}, onChange }) {
  const [query, setQuery] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [isEditing, setIsEditing] = useState(true)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  // Ya no usamos useEffect para sincronizar data.url al inicio, 
  // así siempre arranca en el menú principal tras recargar la página.

  function processUrl(raw) {
    if (!raw) return '';
    let cleanUrl = raw;
    
    if (raw.includes('embed/')) {
      cleanUrl = raw;
    } else if (raw.includes('v=')) {
      const id = raw.split('v=')[1].split('&')[0];
      // Convertir en 'YouTube Mix' explícito
      cleanUrl = `https://www.youtube.com/embed/${id}?listType=playlist&list=RD${id}`;
    } else if (!raw.includes('http') && raw.length === 11) {
      cleanUrl = `https://www.youtube.com/embed/${raw}?listType=playlist&list=RD${raw}`;
    } else {
      // Fallback de búsqueda oficial
      cleanUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(raw)}`;
    }
    
    // Remover estrictamente cualquier parámetro autoplay para guardarlo limpio
    return cleanUrl.replace(/[?&]autoplay=1/g, '');
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResults([])

    try {
      const data = await musicAPI.search(query)
      if (data && data.length > 0) {
        setResults(data)
      } else {
        throw new Error('No results')
      }
    } catch (err) {
      console.warn('Fallo lista, usando Smart Embed:', err)
      const smartUrl = processUrl(query)
      const separator = smartUrl.includes('?') ? '&' : '?'
      
      // Guardar sin autoplay, preservando estaciones personalizadas
      onChange({ ...data, url: smartUrl })
      // Reproducir con autoplay inmediatamente
      setEmbedUrl(smartUrl + separator + 'autoplay=1')
      setIsEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const selectVideo = (id) => {
    const cleanUrl = processUrl(id)
    const separator = cleanUrl.includes('?') ? '&' : '?'
    
    onChange({ ...data, url: cleanUrl })
    setEmbedUrl(cleanUrl + separator + 'autoplay=1')
    setIsEditing(false)
  }

  const selectStation = (stationUrl) => {
    const cleanUrl = processUrl(stationUrl)
    const separator = cleanUrl.includes('?') ? '&' : '?'
    
    onChange({ ...data, url: cleanUrl })
    setEmbedUrl(cleanUrl + separator + 'autoplay=1')
    setIsEditing(false)
  }



  const customStations = data.customStations || [];
  const allStations = [...STATIONS, ...customStations];

  const addCustomStation = (res, e) => {
    e.stopPropagation();
    const newStation = {
      id: res.id,
      label: res.title.length > 15 ? res.title.substring(0, 15) + '...' : res.title,
      icon: '⭐',
      url: `https://www.youtube.com/watch?v=${res.id}`
    };
    if (!customStations.find(s => s.id === res.id)) {
      onChange({ ...data, customStations: [...customStations, newStation] });
    }
  };

  const removeCustomStation = (id, e) => {
    e.stopPropagation();
    onChange({ ...data, customStations: customStations.filter(s => s.id !== id) });
  };

  return (
    <div className="music-module">
      {isEditing ? (
        <div className="music-setup">
          <div className="music-header">
            <h3>Music Hub</h3>
            <p>Sonidos para potenciar tu enfoque</p>
          </div>

          <div className="music-stations-grid">
            {allStations.map(s => {
              const isCustom = customStations.some(c => c.id === s.id);
              return (
                <div key={s.id} className="station-card" onClick={() => selectStation(s.url)}>
                  {isCustom && (
                    <button 
                      className="station-remove-btn" 
                      onClick={(e) => removeCustomStation(s.id, e)}
                      title="Eliminar"
                    >×</button>
                  )}
                  <span className="station-icon">{s.icon}</span>
                  <span className="station-label">{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="music-search-box">
            <div className="search-input-wrapper">
              <input 
                type="text" 
                placeholder="Busca artista o género..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {(query || results.length > 0) && (
                <button className="search-clear" onClick={clearSearch} title="Limpiar">
                  ×
                </button>
              )}
              <button className="search-trigger" onClick={handleSearch} disabled={loading}>
                {loading ? '⏳' : '🔍'}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="music-results">
              {results.map(res => {
                const isPinned = customStations.some(s => s.id === res.id);
                return (
                  <div key={res.id} className="result-item" onClick={() => selectVideo(res.id)}>
                    <div className="res-info">
                      <span className="res-title">{res.title}</span>
                      <span className="res-author">{res.author}</span>
                    </div>
                    <div className="res-actions">
                      <button 
                        className="res-pin" 
                        onClick={(e) => addCustomStation(res, e)}
                        title={isPinned ? "Ya está fijado" : "Fijar estación"}
                        disabled={isPinned}
                        style={{ opacity: isPinned ? 0.3 : 1 }}
                      >
                        📌
                      </button>
                      <span className="res-play">▶</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="music-player">
          <div className="player-controls">
            <button className="btn-change" onClick={() => setIsEditing(true)}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M11 19l-7-7 7-7M20 12H5" />
              </svg>
              Cambiar Estación
            </button>
          </div>
          <iframe
            src={embedUrl}
            title="WorkDesk Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  )
}
