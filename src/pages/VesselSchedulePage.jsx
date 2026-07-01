import React, { useState, useEffect } from 'react';
import { Ship, ExternalLink, Search, Calendar, Package } from 'lucide-react';
import { shipmentsApi } from '../services/api';
import { formatDateUTC } from '../utils/dateUtils';

const PORTS = [
  {
    region: 'USA — East Coast',
    ports: [
      { name: 'Philadelphia, PA', terminals: [
        { name: 'PhilaPort Vessel Schedules', url: 'https://www.philaport.com/vessel-schedules/' },
        { name: 'Packer Marine Terminal', url: 'https://www.philaport.com/vessel-schedules/' },
      ]},
      { name: 'Newark / New York, NJ', terminals: [
        { name: 'APM Terminals Port Elizabeth', url: 'https://www.apmterminals.com/en/port-elizabeth/schedule' },
        { name: 'Port Newark Container Terminal', url: 'https://www.pnct.net/vessel-schedule/' },
        { name: 'GCT Bayonne', url: 'https://www.globalterminals.com/bayonne/operations/vessel-schedule/' },
      ]},
      { name: 'Baltimore, MD', terminals: [
        { name: 'Seagirt Marine Terminal', url: 'https://www.seagirtmarine.com/vessel-schedule/' },
        { name: 'South Locust Point', url: 'https://www.mpa.maryland.gov/Pages/vessel-schedule.aspx' },
      ]},
      { name: 'Savannah, GA', terminals: [
        { name: 'Georgia Ports Authority', url: 'https://gaports.com/vessel-schedules/' },
        { name: 'Garden City Terminal', url: 'https://gaports.com/vessel-schedules/' },
      ]},
      { name: 'Miami, FL', terminals: [
        { name: 'PortMiami Vessel Schedules', url: 'https://www.portmiami.com/business/vessel-schedules' },
      ]},
      { name: 'Boston, MA', terminals: [
        { name: 'Conley Terminal', url: 'https://www.massport.com/conley-terminal/about-conley/vessel-schedules/' },
      ]},
    ],
  },
  {
    region: 'USA — Gulf Coast',
    ports: [
      { name: 'Houston, TX', terminals: [
        { name: 'Bayport Container Terminal', url: 'https://bayport.porthouston.com/vessel-schedules' },
        { name: 'Barbours Cut Terminal', url: 'https://www.porthouston.com/vessel-schedules/' },
      ]},
      { name: 'New Orleans, LA', terminals: [
        { name: 'Port of New Orleans', url: 'https://portno.com/vessel-schedule' },
      ]},
    ],
  },
  {
    region: 'USA — West Coast',
    ports: [
      { name: 'Los Angeles, CA', terminals: [
        { name: 'TraPac Terminal', url: 'https://www.trapac.com/schedule/' },
        { name: 'APM Terminals Pier 400', url: 'https://www.apmterminals.com/en/los-angeles/schedule' },
        { name: 'Everport Terminal', url: 'https://www.everport.com/vessel-schedules/' },
      ]},
      { name: 'Long Beach, CA', terminals: [
        { name: 'Long Beach Container Terminal', url: 'https://www.lbct.com/operations/vessel-schedule' },
        { name: 'Pacific Container Terminal', url: 'https://www.pct.com/vessel-schedule' },
      ]},
      { name: 'Seattle / Tacoma, WA', terminals: [
        { name: 'Northwest Seaport Alliance', url: 'https://www.nwseaportalliance.com/vessel-schedule' },
      ]},
    ],
  },
  {
    region: 'Morocco',
    ports: [
      { name: 'Agadir', terminals: [
        { name: 'Marsa Maroc — Agadir', url: 'https://www.marsa-maroc.ma/en/ports/agadir/' },
        { name: 'SOMAPORT Agadir', url: 'https://www.somaport.ma/' },
      ]},
      { name: 'Tanger Med', terminals: [
        { name: 'Tanger Med Vessel Schedule', url: 'https://www.tangermed.ma/en/vessel-schedule/' },
        { name: 'APM Terminals Tangier', url: 'https://www.apmterminals.com/en/tangier/schedule' },
      ]},
      { name: 'Casablanca', terminals: [
        { name: 'Marsa Maroc — Casablanca', url: 'https://www.marsa-maroc.ma/en/ports/casablanca/' },
      ]},
    ],
  },
  {
    region: 'Peru',
    ports: [
      { name: 'Callao / Lima', terminals: [
        { name: 'APM Terminals Callao', url: 'https://www.apmterminals.com/en/callao/schedule' },
        { name: 'DPWorld Callao', url: 'https://dpworldcallao.com.pe/' },
        { name: 'Neptunia', url: 'https://www.neptunia.com.pe/' },
      ]},
    ],
  },
  {
    region: 'South Africa',
    ports: [
      { name: 'Cape Town', terminals: [
        { name: 'Transnet Port Terminals', url: 'https://www.transnetportterminals.net/vessel-schedule' },
      ]},
      { name: 'Durban', terminals: [
        { name: 'Durban Container Terminal', url: 'https://www.transnetportterminals.net/vessel-schedule' },
      ]},
    ],
  },
  {
    region: 'Spain',
    ports: [
      { name: 'Algeciras', terminals: [
        { name: 'APM Terminals Algeciras', url: 'https://www.apmterminals.com/en/algeciras/schedule' },
        { name: 'Total Terminal International', url: 'https://www.ttia.es/' },
      ]},
      { name: 'Valencia', terminals: [
        { name: 'MSC Terminal Valencia', url: 'https://www.mscterminals.com/our-terminals/europe/msc-terminal-valencia/' },
      ]},
    ],
  },
];

const STATUS_COLORS = {
  Booked: '#38bdf8', 'In Transit': '#a78bfa', Arrived: '#22c55e',
  Delivered: '#94a3b8', 'Empty Return Pending': '#ef4444', 'Empty Returned': '#64748b',
};

export default function VesselSchedulePage({ selectedCompany }) {
  const [search, setSearch] = useState('');
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    shipmentsApi.getAll().then(all => {
      setShipments(Array.isArray(all) ? all : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedCompany?.id]);

  // Group active shipments by vessel
  const byVessel = {};
  shipments
    .filter(s => s.vesselName && !['Delivered', 'Empty Returned'].includes(s.status))
    .forEach(s => {
      const key = s.vesselName.trim().toUpperCase();
      if (!byVessel[key]) byVessel[key] = { name: s.vesselName, shipments: [] };
      byVessel[key].shipments.push(s);
    });
  const vesselList = Object.values(byVessel).sort((a, b) => {
    const etaA = a.shipments[0]?.vesselEta || '9999';
    const etaB = b.shipments[0]?.vesselEta || '9999';
    return etaA.localeCompare(etaB);
  });

  const filteredPorts = PORTS.map(region => ({
    ...region,
    ports: region.ports.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(r => r.ports.length > 0);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Ship size={24} style={{ color: 'var(--orange-primary)' }} />
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Vessel Schedule</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Active vessels in system · Port terminal links
          </p>
        </div>
      </div>

      {/* Active vessels in system */}
      {!loading && vesselList.length > 0 && (
        <div className="glass-panel" style={{ padding: 20, marginBottom: 28 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Active Vessels in System
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vesselList.map(v => {
              const earliestEta = v.shipments.reduce((min, s) => {
                if (!s.vesselEta) return min;
                return !min || s.vesselEta < min ? s.vesselEta : min;
              }, null);
              return (
                <div key={v.name} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Ship size={14} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>
                        {v.shipments.length} container{v.shipments.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {earliestEta && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#38bdf8' }}>
                        <Calendar size={13} />
                        ETA {formatDateUTC(earliestEta)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {v.shipments.map(s => (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '4px 10px', fontSize: '0.76rem',
                      }}>
                        <Package size={11} style={{ color: 'var(--text-muted)' }} />
                        <span>{s.containerNumber || s.label || s.id.slice(0, 8)}</span>
                        <span style={{
                          fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4,
                          background: `${STATUS_COLORS[s.status] || '#94a3b8'}20`,
                          color: STATUS_COLORS[s.status] || '#94a3b8',
                          fontWeight: 600,
                        }}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Port terminal links */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Port Terminal Links
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="ui-input"
              placeholder="Search port…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: '0.82rem', width: 200, padding: '6px 10px 6px 30px' }}
            />
          </div>
        </div>

        {/* Region tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          <button
            onClick={() => setSelectedRegion(null)}
            style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              background: selectedRegion === null ? 'var(--orange-primary)' : 'rgba(255,255,255,0.07)',
              color: selectedRegion === null ? '#fff' : 'var(--text-muted)',
            }}
          >All</button>
          {PORTS.map(r => (
            <button
              key={r.region}
              onClick={() => setSelectedRegion(r.region === selectedRegion ? null : r.region)}
              style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                background: selectedRegion === r.region ? 'var(--orange-primary)' : 'rgba(255,255,255,0.07)',
                color: selectedRegion === r.region ? '#fff' : 'var(--text-muted)',
              }}
            >{r.region}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredPorts
            .filter(r => !selectedRegion || r.region === selectedRegion)
            .flatMap(r => r.ports.map(p => ({ ...p, region: r.region })))
            .map(port => (
              <div key={port.name} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>{port.name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 10 }}>{port.region}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {port.terminals.map(t => (
                    <a
                      key={t.name}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', borderRadius: 8,
                        background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)',
                        color: 'var(--orange-primary)', fontSize: '0.78rem', fontWeight: 600,
                        textDecoration: 'none', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,0,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,0,0.08)'}
                    >
                      <ExternalLink size={12} />
                      {t.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
