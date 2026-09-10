import '@xyflow/react/dist/style.css'

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type OnConnect,
} from '@xyflow/react'
import {
  Server,
  ShieldCheck,
  GitMerge,
  Network,
  Monitor,
  Wifi,
  HardDrive,
  Cloud,
  Globe,
  Printer,
  Cpu,
  Trash2,
  Save,
  Download,
  X,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useApp } from '../context/useApp'
import type {
  DiagramNode,
  DiagramEdge,
  DiagramDeviceType,
  DiagramConnectionType,
} from '../api/types'
import { v7 as uuidv7 } from 'uuid';
// ─── Constants ───────────────────────────────────────────────────────────────

const DEVICE_COLORS: Record<DiagramDeviceType, string> = {
  server: '#2563eb',
  firewall: '#ef4444',
  switch: '#f97316',
  router: '#7c3aed',
  workstation: '#22c55e',
  ap: '#06b6d4',
  storage: '#f59e0b',
  cloud: '#8b5cf6',
  internet: '#6b7280',
  printer: '#10b981',
  custom: '#6b7280',
}

const CONNECTION_COLORS: Record<DiagramConnectionType, string> = {
  ethernet: '#8d9eb5',
  fiber: '#2563eb',
  wireless: '#22d3ee',
  vpn: '#7c3aed',
  wan: '#f97316',
}

const CONNECTION_LABELS: Record<DiagramConnectionType, string> = {
  ethernet: 'Ethernet',
  fiber: 'Fiber',
  wireless: 'Wireless',
  vpn: 'VPN',
  wan: 'WAN',
}

const DEVICE_LABELS: Record<DiagramDeviceType, string> = {
  server: 'Server',
  firewall: 'Firewall',
  switch: 'Switch',
  router: 'Router',
  workstation: 'Workstation',
  ap: 'Access Point',
  storage: 'Storage',
  cloud: 'Cloud',
  internet: 'Internet',
  printer: 'Printer',
  custom: 'Custom',
}

const DEVICE_TYPES: DiagramDeviceType[] = [
  'server', 'firewall', 'switch', 'router', 'workstation',
  'ap', 'storage', 'cloud', 'internet', 'printer', 'custom',
]

const CONNECTION_TYPES: DiagramConnectionType[] = ['ethernet', 'fiber', 'wireless', 'vpn', 'wan']

// ─── Icon Component ──────────────────────────────────────────────────────────

function DeviceIcon({ type, size = 18 }: { type: DiagramDeviceType; size?: number }) {
  const props = { size, strokeWidth: 1.8 }
  switch (type) {
    case 'server':     return <Server {...props} />
    case 'firewall':   return <ShieldCheck {...props} />
    case 'switch':     return <GitMerge {...props} />
    case 'router':     return <Network {...props} />
    case 'workstation':return <Monitor {...props} />
    case 'ap':         return <Wifi {...props} />
    case 'storage':    return <HardDrive {...props} />
    case 'cloud':      return <Cloud {...props} />
    case 'internet':   return <Globe {...props} />
    case 'printer':    return <Printer {...props} />
    default:           return <Cpu {...props} />
  }
}

// ─── Edge Style Helper ───────────────────────────────────────────────────────

function edgeStyleForType(connectionType: DiagramConnectionType): React.CSSProperties {
  const color = CONNECTION_COLORS[connectionType]
  const dashed = connectionType === 'wireless' || connectionType === 'vpn'
  return {
    stroke: color,
    strokeWidth: 2,
    strokeDasharray: dashed ? '6 4' : undefined,
  }
}

function rfEdgeFromDiagram(e: DiagramEdge): Edge {
  const color = CONNECTION_COLORS[e.connectionType]
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    data: { connectionType: e.connectionType },
    style: edgeStyleForType(e.connectionType),
    labelStyle: { fill: '#8d9eb5', fontSize: 10, fontFamily: 'monospace' },
    labelBgStyle: { fill: '#131920', fillOpacity: 0.9 },
    labelBgPadding: [4, 4] as [number, number],
    markerEnd: { type: MarkerType.ArrowClosed, color },
  }
}

function rfNodeFromDiagram(n: DiagramNode): Node {
  return {
    id: n.id,
    type: 'device',
    position: { x: n.x, y: n.y },
    data: {
      deviceType: n.deviceType,
      label: n.label,
      ip: n.ip,
      color: n.color,
      assetId: n.assetId,
    },
  }
}

// ─── Custom Device Node ───────────────────────────────────────────────────────

function DeviceNode({ data, selected }: NodeProps) {
  const deviceType = (data.deviceType as DiagramDeviceType) ?? 'custom'
  const baseColor = (data.color as string) ?? DEVICE_COLORS[deviceType]
  const label = (data.label as string) ?? 'Device'
  const ip = data.ip as string | undefined

  return (
    <div className="flex flex-col items-center select-none" style={{ minWidth: 80 }}>
      {/* Handles */}
      <Handle type="target" position={Position.Top}    style={{ background: '#253044', border: '1.5px solid #2d3f56', width: 8, height: 8, top: -4 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#253044', border: '1.5px solid #2d3f56', width: 8, height: 8, bottom: -4 }} />
      <Handle type="target" position={Position.Left}   style={{ background: '#253044', border: '1.5px solid #2d3f56', width: 8, height: 8, left: -4 }} />
      <Handle type="source" position={Position.Right}  style={{ background: '#253044', border: '1.5px solid #2d3f56', width: 8, height: 8, right: -4 }} />

      {/* Icon circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: `${baseColor}22`,
          border: selected ? `2px solid ${baseColor}` : `1.5px solid ${baseColor}66`,
          boxShadow: selected ? `0 0 0 3px ${baseColor}44, 0 0 12px ${baseColor}55` : `0 2px 8px ${baseColor}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: baseColor,
          transition: 'box-shadow 0.15s, border-color 0.15s',
        }}
      >
        <DeviceIcon type={deviceType} size={20} />
      </div>

      {/* Label */}
      <span
        style={{
          marginTop: 6,
          fontSize: 11,
          fontWeight: 500,
          color: '#e6edf5',
          maxWidth: 90,
          textAlign: 'center',
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}
      >
        {label}
      </span>

      {/* IP */}
      {ip && (
        <span
          style={{
            marginTop: 2,
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#5c7080',
            letterSpacing: '0.02em',
          }}
        >
          {ip}
        </span>
      )}
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

interface AddNodeModalProps {
  onClose: () => void
  onAdd: (deviceType: DiagramDeviceType, label: string, ip: string) => void
  initialType?: DiagramDeviceType
}

function AddNodeModal({ onClose, onAdd, initialType = 'server' }: AddNodeModalProps) {
  const [deviceType, setDeviceType] = useState<DiagramDeviceType>(initialType)
  const [label, setLabel] = useState('')
  const [ip, setIp] = useState('')

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 style={{ color: '#e6edf5', fontSize: 14, fontWeight: 600 }}>Add Device</h3>
          <button onClick={onClose} style={{ color: '#5c7080' }} className="hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Device type grid */}
        <div>
          <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Device Type
          </label>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {DEVICE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => {
                  setDeviceType(t)
                  setLabel(DEVICE_LABELS[t])
                }}
                style={{
                  background: deviceType === t ? `${DEVICE_COLORS[t]}22` : '#131920',
                  border: deviceType === t ? `1.5px solid ${DEVICE_COLORS[t]}` : '1.5px solid #1e2a3a',
                  borderRadius: 6,
                  padding: '6px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  color: deviceType === t ? DEVICE_COLORS[t] : '#8d9eb5',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <DeviceIcon type={t} size={14} />
                <span style={{ fontSize: 9, fontWeight: 500, lineHeight: 1 }}>{DEVICE_LABELS[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Label & IP */}
        <div className="flex flex-col gap-2">
          <div>
            <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={{
                marginTop: 4,
                width: '100%',
                background: '#070b10',
                border: '1px solid #1e2a3a',
                borderRadius: 6,
                padding: '7px 10px',
                color: '#e6edf5',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#1e2a3a')}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>IP Address</label>
            <input
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 10.0.1.1"
              style={{
                marginTop: 4,
                width: '100%',
                background: '#070b10',
                border: '1px solid #1e2a3a',
                borderRadius: 6,
                padding: '7px 10px',
                color: '#e6edf5',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#1e2a3a')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            style={{ background: '#131920', border: '1px solid #1e2a3a', borderRadius: 6, padding: '7px 14px', color: '#8d9eb5', fontSize: 12, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onAdd(deviceType, label || DEVICE_LABELS[deviceType], ip); onClose() }}
            style={{ background: '#2563eb', border: 'none', borderRadius: 6, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Add Device
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

interface ConnectEdgeModalProps {
  onClose: () => void
  onConfirm: (connectionType: DiagramConnectionType, label: string) => void
}

function ConnectEdgeModal({ onClose, onConfirm }: ConnectEdgeModalProps) {
  const [connectionType, setConnectionType] = useState<DiagramConnectionType>('ethernet')
  const [label, setLabel] = useState('')

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 style={{ color: '#e6edf5', fontSize: 14, fontWeight: 600 }}>New Connection</h3>
          <button onClick={onClose} style={{ color: '#5c7080' }} className="hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Connection type */}
        <div>
          <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Connection Type
          </label>
          <div className="flex flex-col gap-1 mt-2">
            {CONNECTION_TYPES.map(ct => (
              <button
                key={ct}
                onClick={() => setConnectionType(ct)}
                style={{
                  background: connectionType === ct ? `${CONNECTION_COLORS[ct]}18` : 'transparent',
                  border: connectionType === ct ? `1px solid ${CONNECTION_COLORS[ct]}66` : '1px solid #1e2a3a',
                  borderRadius: 6,
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: connectionType === ct ? CONNECTION_COLORS[ct] : '#8d9eb5',
                  fontSize: 12,
                  textAlign: 'left',
                  transition: 'all 0.1s',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 2,
                    background: CONNECTION_COLORS[ct],
                    borderRadius: 2,
                    display: 'block',
                    flexShrink: 0,
                    borderTop: (ct === 'wireless' || ct === 'vpn') ? '2px dashed ' + CONNECTION_COLORS[ct] : undefined,
                    opacity: 0.9,
                  }}
                />
                {CONNECTION_LABELS[ct]}
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div>
          <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Label <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. 1Gbps, VLAN 10"
            style={{
              marginTop: 4,
              width: '100%',
              background: '#070b10',
              border: '1px solid #1e2a3a',
              borderRadius: 6,
              padding: '7px 10px',
              color: '#e6edf5',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#2563eb')}
            onBlur={e => (e.target.style.borderColor = '#1e2a3a')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            style={{ background: '#131920', border: '1px solid #1e2a3a', borderRadius: 6, padding: '7px 14px', color: '#8d9eb5', fontSize: 12, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(connectionType, label); onClose() }}
            style={{ background: '#2563eb', border: 'none', borderRadius: 6, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Connect
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

interface EditNodeModalProps {
  node: Node
  onClose: () => void
  onSave: (id: string, deviceType: DiagramDeviceType, label: string, ip: string, color: string) => void
}

function EditNodeModal({ node, onClose, onSave }: EditNodeModalProps) {
  const [deviceType, setDeviceType] = useState<DiagramDeviceType>((node.data.deviceType as DiagramDeviceType) ?? 'custom')
  const [label, setLabel] = useState((node.data.label as string) ?? '')
  const [ip, setIp] = useState((node.data.ip as string) ?? '')
  const [color, setColor] = useState(
    () => (node.data.color as string) ?? DEVICE_COLORS[deviceType]
  )

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 style={{ color: '#e6edf5', fontSize: 14, fontWeight: 600 }}>Edit Device</h3>
          <button onClick={onClose} style={{ color: '#5c7080' }} className="hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Device type grid */}
        <div>
          <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Device Type
          </label>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {DEVICE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => {
                  setDeviceType(t)

                  if (!node.data.color) {
                    setColor(DEVICE_COLORS[t])
                  }
                }}
                style={{
                  background: deviceType === t ? `${DEVICE_COLORS[t]}22` : '#131920',
                  border: deviceType === t ? `1.5px solid ${DEVICE_COLORS[t]}` : '1.5px solid #1e2a3a',
                  borderRadius: 6,
                  padding: '6px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  color: deviceType === t ? DEVICE_COLORS[t] : '#8d9eb5',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <DeviceIcon type={t} size={14} />
                <span style={{ fontSize: 9, fontWeight: 500, lineHeight: 1 }}>{DEVICE_LABELS[t]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={{
                marginTop: 4, width: '100%', background: '#070b10', border: '1px solid #1e2a3a',
                borderRadius: 6, padding: '7px 10px', color: '#e6edf5', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#1e2a3a')}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>IP Address</label>
            <input
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 10.0.1.1"
              style={{
                marginTop: 4, width: '100%', background: '#070b10', border: '1px solid #1e2a3a',
                borderRadius: 6, padding: '7px 10px', color: '#e6edf5', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#1e2a3a')}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Color Override</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{
                  width: 32, height: 28, padding: 2, background: '#131920', border: '1px solid #1e2a3a',
                  borderRadius: 6, cursor: 'pointer', outline: 'none',
                }}
              />
              <span style={{ fontSize: 11, color: '#5c7080', fontFamily: 'monospace' }}>{color}</span>
              <button
                onClick={() => setColor(DEVICE_COLORS[deviceType])}
                style={{ marginLeft: 'auto', fontSize: 10, color: '#5c7080', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            style={{ background: '#131920', border: '1px solid #1e2a3a', borderRadius: 6, padding: '7px 14px', color: '#8d9eb5', fontSize: 12, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(node.id, deviceType, label, ip, color); onClose() }}
            style={{ background: '#2563eb', border: 'none', borderRadius: 6, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(7,11,16,0.75)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 10,
          padding: 20, width: 320, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  selectedConnectionType: DiagramConnectionType
  onSelectConnectionType: (t: DiagramConnectionType) => void
  onAddDevice: (type: DiagramDeviceType) => void
  onImportAssets: () => void
  onSave: () => void
  onClear: () => void
  isMobile: boolean
  saving: boolean
}

function Toolbar({
  selectedConnectionType,
  onSelectConnectionType,
  onAddDevice,
  onImportAssets,
  onSave,
  onClear,
  isMobile,
  saving,
}: ToolbarProps) {
  const [showDevices, setShowDevices] = useState(true)
  const [showConnections, setShowConnections] = useState(true)

  const content = (
    <>
      {/* Header */}
      <div style={{ padding: isMobile ? '8px 12px' : '14px 16px', borderBottom: '1px solid #1e2a3a', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e6edf5', letterSpacing: '0.04em' }}>
          Network Diagram
        </div>
        <div style={{ fontSize: 10, color: '#5c7080', marginTop: 2 }}>
          Drag to pan · Scroll to zoom · Drag node handles to connect
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: isMobile ? '6px 10px' : '10px 14px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? 16 : 10, flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
        {/* Add Devices */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => setShowDevices(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
              cursor: 'pointer', padding: '3px 0', marginBottom: 6, width: '100%',
            }}
          >
            <ChevronRight
              size={11}
              style={{ color: '#5c7080', transform: showDevices ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s', flexShrink: 0 }}
            />
            <span style={{ fontSize: 10, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Add Device
            </span>
          </button>
          {showDevices && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(11, 44px)' : 'repeat(2, 1fr)', gap: 4 }}>
              {DEVICE_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => onAddDevice(t)}
                  title={DEVICE_LABELS[t]}
                  style={{
                    background: '#131920',
                    border: '1px solid #1e2a3a',
                    borderRadius: 6,
                    padding: '7px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    cursor: 'pointer',
                    color: DEVICE_COLORS[t],
                    transition: 'border-color 0.1s, background 0.1s',
                    minWidth: 0,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.borderColor = `${DEVICE_COLORS[t]}88`
                    el.style.background = `${DEVICE_COLORS[t]}11`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.borderColor = '#1e2a3a'
                    el.style.background = '#131920'
                  }}
                >
                  <DeviceIcon type={t} size={13} />
                  <span style={{ fontSize: 9, color: '#8d9eb5', lineHeight: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {DEVICE_LABELS[t]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Import */}
        <div style={{ flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Inventory
          </span>
          <button
            onClick={onImportAssets}
            style={{
              width: '100%',
              background: '#131920',
              border: '1px solid #1e2a3a',
              borderRadius: 6,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              color: '#8d9eb5',
              fontSize: 11,
              transition: 'border-color 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb88'; (e.currentTarget as HTMLButtonElement).style.color = '#e6edf5' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2a3a'; (e.currentTarget as HTMLButtonElement).style.color = '#8d9eb5' }}
          >
            <Download size={13} />
            Import from Assets
          </button>
        </div>

        {/* Connection Type */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => setShowConnections(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
              cursor: 'pointer', padding: '3px 0', marginBottom: 6, width: '100%',
            }}
          >
            <ChevronRight
              size={11}
              style={{ color: '#5c7080', transform: showConnections ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s', flexShrink: 0 }}
            />
            <span style={{ fontSize: 10, color: '#5c7080', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Connection Type
            </span>
          </button>
          {showConnections && (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 3 }}>
              {CONNECTION_TYPES.map(ct => (
                <button
                  key={ct}
                  onClick={() => onSelectConnectionType(ct)}
                  style={{
                    background: selectedConnectionType === ct ? `${CONNECTION_COLORS[ct]}18` : 'transparent',
                    border: selectedConnectionType === ct ? `1px solid ${CONNECTION_COLORS[ct]}66` : '1px solid #1e2a3a',
                    borderRadius: 6,
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    cursor: 'pointer',
                    color: selectedConnectionType === ct ? CONNECTION_COLORS[ct] : '#5c7080',
                    fontSize: 11,
                    transition: 'all 0.1s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      background: CONNECTION_COLORS[ct],
                      borderRadius: 1,
                      display: 'block',
                      flexShrink: 0,
                    }}
                  />
                  {CONNECTION_LABELS[ct]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ padding: isMobile ? '6px 10px' : '10px 14px', borderTop: '1px solid #1e2a3a', display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            flex: 1, background: '#2563eb', border: 'none', borderRadius: 6,
            padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: saving ? 'default' : 'pointer', color: '#fff', fontSize: 11, fontWeight: 600,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onClear}
          disabled={saving}
          style={{
            background: '#131920', border: '1px solid #ef444444', borderRadius: 6,
            padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            cursor: saving ? 'default' : 'pointer', color: '#ef4444', fontSize: 11,
            opacity: saving ? 0.6 : 1,
          }}
          title="Clear all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <div
        style={{
          background: '#0d1117',
          borderBottom: '1px solid #1e2a3a',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'auto',
          flexShrink: 0,
          maxHeight: 220,
        }}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 200,
        minWidth: 200,
        background: '#0d1117',
        borderRight: '1px solid #1e2a3a',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {content}
    </div>
  )
}

// ─── Asset Type → Device Type mapping ────────────────────────────────────────

function assetTypeToDeviceType(assetType: string): DiagramDeviceType {
  switch (assetType) {
    case 'Server':      return 'server'
    case 'Workstation': return 'workstation'
    case 'Network':     return 'switch'
    case 'Storage':     return 'storage'
    case 'AP':          return 'ap'
    case 'Printer':     return 'printer'
    case 'Phone':       return 'custom'
    default:            return 'custom'
  }
}

// ─── Main Inner Component ─────────────────────────────────────────────────────
// Only ever mounted once diagramNodes/diagramEdges have actually loaded from
// the API (see the isLoading gate in NetworkDiagram below) — so the one-time
// useMemo() seed below is safe and won't freeze on an empty diagram.

function NetworkDiagramInner() {
  const { diagramNodes, diagramEdges, saveDiagram, assets, toast } = useApp()

  // Convert context → RF format (safe: component only mounts after data has loaded)
  const initialNodes = useMemo(() => diagramNodes.map(rfNodeFromDiagram), []) // eslint-disable-line react-hooks/exhaustive-deps
  const initialEdges = useMemo(() => diagramEdges.map(rfEdgeFromDiagram), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Modals
  const [addNodeModal, setAddNodeModal] = useState<DiagramDeviceType | null>(null)
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null)
  const [editNode, setEditNode] = useState<Node | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  // Connection type for new edges
  const [selectedConnectionType, setSelectedConnectionType] = useState<DiagramConnectionType>('ethernet')

  // Save state — surfaced in the toolbar's Save button
  const [saving, setSaving] = useState(false)

  // Responsive
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setIsMobile(e.contentRect.width < 640)
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSave = useCallback(async (rfNodes: Node[], rfEdges: Edge[]) => {
    const dn: DiagramNode[] = rfNodes.map(n => ({
      id: n.id,
      deviceType: (n.data.deviceType as DiagramDeviceType) ?? 'custom',
      label: (n.data.label as string) ?? '',
      ip: n.data.ip as string | undefined,
      color: n.data.color as string | undefined,
      assetId: n.data.assetId as string | undefined,
      x: n.position.x,
      y: n.position.y,
    }))
    const de: DiagramEdge[] = rfEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label as string | undefined,
      connectionType: ((e.data as Record<string, unknown>)?.connectionType as DiagramConnectionType) ?? 'ethernet',
    }))
    setSaving(true)
    try {
      await saveDiagram(dn, de)
    } catch {
      // error toast already fired by AppProvider's guarded wrapper — nothing
      // further to do here; local canvas state is unaffected either way
    } finally {
      setSaving(false)
    }
  }, [saveDiagram])

  const triggerSave = useCallback((rfNodes: Node[], rfEdges: Edge[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void doSave(rfNodes, rfEdges)
    }, 1500)
  }, [doSave])

  const manualSave = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await doSave(nodes, edges)
    toast('Diagram saved', 'success')
  }, [nodes, edges, doSave, toast])

  // Handle node changes with auto-save trigger
  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes)
    // trigger save after position changes
    const hasMoved = changes.some(c => c.type === 'position' && c.dragging === false)
    if (hasMoved) {
      setNodes(nds => {
        triggerSave(nds, edges)
        return nds
      })
    }
  }, [onNodesChange, triggerSave, edges, setNodes])

  // Connect callback
  const onConnect: OnConnect = useCallback((connection) => {
    setPendingConnection(connection)
  }, [])

  const confirmConnection = useCallback((connectionType: DiagramConnectionType, label: string) => {
    if (!pendingConnection) return
    const color = CONNECTION_COLORS[connectionType]
    const newEdge: Edge = {
      ...pendingConnection,
      id: uuidv7(),
      label: label || undefined,
      data: { connectionType },
      style: edgeStyleForType(connectionType),
      labelStyle: { fill: '#8d9eb5', fontSize: 10, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#131920', fillOpacity: 0.9 },
      labelBgPadding: [4, 4] as [number, number],
      markerEnd: { type: MarkerType.ArrowClosed, color },
    } as Edge
    setEdges(eds => {
      const next = addEdge(newEdge, eds)
      triggerSave(nodes, next)
      return next
    })
    setPendingConnection(null)
  }, [pendingConnection, setEdges, nodes, triggerSave])

  // Add device
  const handleAddDevice = useCallback((deviceType: DiagramDeviceType, label: string, ip: string) => {
    const jitter = () => 200 + Math.random() * 200
    const newNode: Node = {
      id: uuidv7(),
      type: 'device',
      position: { x: jitter(), y: jitter() },
      data: { deviceType, label, ip: ip || undefined, color: undefined },
    }
    setNodes(nds => {
      const next = [...nds, newNode]
      triggerSave(next, edges)
      return next
    })
  }, [setNodes, edges, triggerSave])

  // Quick-add from toolbar (no modal for first click)
  const handleToolbarAddDevice = useCallback((type: DiagramDeviceType) => {
    setAddNodeModal(type)
  }, [])

  // Import assets
  const handleImportAssets = useCallback(() => {
    const existingAssetIds = new Set(nodes.map(n => n.data.assetId as string).filter(Boolean))
    const toAdd = assets.filter(a => !existingAssetIds.has(a.id))
    if (toAdd.length === 0) {
      toast('All assets are already on the diagram', 'info')
      return
    }
    const cols = 4
    setNodes(nds => {
      const next = [...nds]
      toAdd.forEach((a, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        next.push({
          id: uuidv7(),
          type: 'device',
          position: { x: 80 + col * 160, y: 80 + row * 140 + (nds.length > 0 ? 300 : 0) },
          data: {
            deviceType: assetTypeToDeviceType(a.type),
            label: a.name,
            ip: a.ip || undefined,
            assetId: a.id,
          },
        })
      })
      triggerSave(next, edges)
      return next
    })
    toast(`Imported ${toAdd.length} asset(s) to diagram`, 'success')
  }, [assets, nodes, setNodes, edges, triggerSave, toast])

  // Double-click node to edit
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setEditNode(node)
  }, [])

  const handleEditNodeSave = useCallback((id: string, deviceType: DiagramDeviceType, label: string, ip: string, color: string) => {
    setNodes(nds => {
      const next = nds.map(n =>
        n.id === id
          ? { ...n, data: { ...n.data, deviceType, label, ip: ip || undefined, color: color || undefined } }
          : n
      )
      triggerSave(next, edges)
      return next
    })
    setEditNode(null)
  }, [setNodes, edges, triggerSave])

  // Edge click
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id)
  }, [])

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return
    setEdges(eds => {
      const next = eds.filter(e => e.id !== selectedEdgeId)
      triggerSave(nodes, next)
      return next
    })
    setSelectedEdgeId(null)
  }, [selectedEdgeId, setEdges, nodes, triggerSave])

  // Keyboard delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        if (selectedEdgeId) {
          deleteSelectedEdge()
        }
        // ReactFlow handles node deletion via its own keyboard handling (Delete key on selected nodes)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedEdgeId, deleteSelectedEdge])

  // Clear all
  const handleClear = useCallback(async () => {
    if (!window.confirm('Clear all nodes and edges from the diagram?')) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setNodes([])
    setEdges([])
    setSaving(true)
    try {
      await saveDiagram([], [])
      toast('Diagram cleared', 'info')
    } catch {
      // error toast already fired by AppProvider — canvas is already cleared
      // locally, which matches user intent even if the persist failed
    } finally {
      setSaving(false)
    }
  }, [setNodes, setEdges, saveDiagram, toast])

  const nodeTypes = useMemo(() => ({ device: DeviceNode }), [])

  // Highlight selected edge
  const displayEdges = useMemo(() =>
    edges.map(e => ({
      ...e,
      style: {
        ...e.style,
        ...(e.id === selectedEdgeId ? { strokeWidth: 3, opacity: 1 } : { opacity: 0.8 }),
      },
    })),
    [edges, selectedEdgeId]
  )

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', width: '100%', background: '#070b10' }}
    >
      <Toolbar
        selectedConnectionType={selectedConnectionType}
        onSelectConnectionType={setSelectedConnectionType}
        onAddDevice={handleToolbarAddDevice}
        onImportAssets={handleImportAssets}
        onSave={manualSave}
        onClear={handleClear}
        isMobile={isMobile}
        saving={saving}
      />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Edge delete overlay */}
        {selectedEdgeId && (
          <div
            style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 10, background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 8,
              padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <span style={{ fontSize: 11, color: '#8d9eb5' }}>Edge selected</span>
            <button
              onClick={deleteSelectedEdge}
              style={{
                background: '#ef444420', border: '1px solid #ef444466', borderRadius: 5,
                padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', color: '#ef4444', fontSize: 11,
              }}
            >
              <Trash2 size={11} />
              Delete
            </button>
            <button
              onClick={() => setSelectedEdgeId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5c7080', padding: '2px 4px' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={() => setSelectedEdgeId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={['Delete', 'Backspace']}
          style={{ background: '#070b10' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            bgColor="#070b10"
            color="#1e2a3a"
            gap={24}
            size={1}
          />
          <Controls
            style={{
              background: '#0d1117',
              border: '1px solid #1e2a3a',
              borderRadius: 8,
            }}
          />
          <MiniMap
            position="bottom-right"
            style={{
              background: '#131920',
              border: '1px solid #1e2a3a',
              borderRadius: 8,
            }}
            nodeColor={(n) => {
              const dt = (n.data?.deviceType as DiagramDeviceType) ?? 'custom'
              return (n.data?.color as string) ?? DEVICE_COLORS[dt]
            }}
            maskColor="rgba(7,11,16,0.7)"
          />
        </ReactFlow>
      </div>

      {/* Add Node Modal */}
      {addNodeModal !== null && (
        <AddNodeModal
          initialType={addNodeModal}
          onClose={() => setAddNodeModal(null)}
          onAdd={handleAddDevice}
        />
      )}

      {/* Connect Edge Modal */}
      {pendingConnection && (
        <ConnectEdgeModal
          onClose={() => setPendingConnection(null)}
          onConfirm={confirmConnection}
        />
      )}

      {/* Edit Node Modal */}
      {editNode && (
        <EditNodeModal
          node={editNode}
          onClose={() => setEditNode(null)}
          onSave={handleEditNodeSave}
        />
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function NetworkDiagram() {
  const { isLoading } = useApp()

  // NetworkDiagramInner seeds its React Flow state from diagramNodes/diagramEdges
  // exactly once (useMemo with empty deps) — mounting it before the API fetch
  // resolves would permanently freeze the canvas empty, so gate on isLoading here.
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: '#070b10' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#5c7080' }} />
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <NetworkDiagramInner />
    </ReactFlowProvider>
  )
}