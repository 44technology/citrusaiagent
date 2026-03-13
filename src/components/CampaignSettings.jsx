import React, { useState } from 'react';
import { Settings2, Play, Loader2 } from 'lucide-react';

const CampaignSettings = ({ onStart, isRunning, contactCount, isDetailView }) => {
  const [fruitPitch, setFruitPitch] = useState('Florida Oranges (Sweet & Juicy)');
  const [agentLanguage, setAgentLanguage] = useState('Auto-detect (English/Spanish based on row)');
  const [outreachMethod, setOutreachMethod] = useState('Voice Call & Follow-up Email');
  const [callingPace, setCallingPace] = useState('Standard');

  const handleStart = () => {
    const settings = { fruitPitch, agentLanguage, outreachMethod, callingPace };
    onStart(settings);
  };

  return (
    <div className="campaign-settings" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings2 size={20} className="text-orange" />
          Campaign Setup
        </h3>
        <p className="text-sec mt-2" style={{ fontSize: '0.9rem' }}>
          Configure your Citrus AI Agent's behavior before starting the calls.
        </p>
      </div>

      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>PRIMARY FRUIT PITCH</label>
        <select 
          className="ui-select" 
          style={selectStyle}
          value={fruitPitch}
          onChange={(e) => setFruitPitch(e.target.value)}
        >
          <option>Florida Oranges (Sweet & Juicy)</option>
          <option>California Lemons (Premium Tart)</option>
          <option>Ruby Red Grapefruits</option>
        </select>
      </div>

      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>AGENT LANGUAGE</label>
        <select 
          className="ui-select" 
          style={selectStyle}
          value={agentLanguage}
          onChange={(e) => setAgentLanguage(e.target.value)}
        >
          <option>Auto-detect (English/Spanish based on row)</option>
          <option>Strictly English</option>
          <option>Strictly Spanish</option>
        </select>
      </div>
      
      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>OUTREACH METHOD</label>
        <select 
          className="ui-select" 
          style={selectStyle}
          value={outreachMethod}
          onChange={(e) => setOutreachMethod(e.target.value)}
        >
          <option>Voice Call & Follow-up Email</option>
          <option>Voice Call Only</option>
          <option>Email Only</option>
        </select>
      </div>

      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>CALLER ID (GOOGLE VOICE)</label>
        <div style={{...selectStyle, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-secondary)'}}>
          <span style={{ color: 'var(--green-accent)' }}>●</span> +1 628 261 2344
        </div>
      </div>
      
      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>CALLING PACE</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div 
            className="pace-option" 
            style={{
              ...paceStyle, 
              ...(callingPace === 'Standard' ? { border: '1px solid var(--orange-primary)', background: 'rgba(255, 122, 0, 0.1)' } : {})
            }}
            onClick={() => setCallingPace('Standard')}
          >
            Standard
          </div>
          <div 
            className="pace-option" 
            style={{
              ...paceStyle,
              ...(callingPace === 'Aggressive' ? { border: '1px solid var(--orange-primary)', background: 'rgba(255, 122, 0, 0.1)' } : {})
            }}
            onClick={() => setCallingPace('Aggressive')}
          >
            Aggressive
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-glass)' }}>
        {!isDetailView && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem' }}>
            <span className="text-sec">Contacts Ready:</span>
            <strong>{contactCount}</strong>
          </div>
        )}
        
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '16px' }}
          onClick={handleStart}
          disabled={isRunning || (!isDetailView && contactCount === 0)}
        >
          {isRunning ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Campaign Running...
            </>
          ) : (
            <>
              <Play size={20} />
              {isDetailView ? 'Start AI Outreach' : 'Start Bulk Campaign'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const selectStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-glass)',
  borderRadius: 'var(--radius-sm)',
  color: 'white',
  fontFamily: 'var(--font-main)',
  outline: 'none',
  appearance: 'none'
};

const paceStyle = {
  flex: 1,
  padding: '10px',
  textAlign: 'center',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-glass)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600
};

export default CampaignSettings;
