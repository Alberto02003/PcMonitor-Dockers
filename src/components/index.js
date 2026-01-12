/**
 * Exportacion centralizada de componentes
 */

// Componentes existentes
export { NotificationProvider, useNotification } from './Notification/Notification.jsx'
export { SettingsProvider, useSettings } from './Settings/Settings.jsx'

// Nuevos componentes UX (Fase 5)
export { default as ConfirmModal } from './ConfirmModal/ConfirmModal.jsx'
export { default as ConnectionStatus, STATUS } from './ConnectionStatus/ConnectionStatus.jsx'
export { default as AlertBadge, AlertList, AlertWidget } from './AlertBadge/AlertBadge.jsx'
export { default as LastUpdate, getRelativeTime } from './LastUpdate/LastUpdate.jsx'

// Componentes visuales (Mejoras UX)
export { default as Sparkline, SparklineBar } from './Sparkline/Sparkline.jsx'
export { default as AnimatedValue, AnimatedBytes, AnimatedPercent } from './AnimatedValue/AnimatedValue.jsx'
export { default as ServerAvatar, ServerAvatarGroup, ServerAvatarWithInfo } from './ServerAvatar/ServerAvatar.jsx'
