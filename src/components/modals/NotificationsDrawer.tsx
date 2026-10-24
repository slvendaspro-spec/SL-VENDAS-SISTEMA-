import React from 'react';
import { X, Bell, Check, Trash2, CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Central de Alertas & Notificações</h3>
              <p className="text-[11px] text-slate-400">
                {notifications.filter((n) => !n.isRead).length} não lidas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between py-2.5 text-xs border-b border-slate-800/80 shrink-0">
          <button
            onClick={markAllNotificationsAsRead}
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Marcar lidas</span>
          </button>
          <button
            onClick={clearNotifications}
            className="text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar todas</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p>Nenhuma notificação no momento.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon =
                n.severity === 'alert'
                  ? AlertCircle
                  : n.severity === 'warning'
                  ? AlertTriangle
                  : n.severity === 'success'
                  ? CheckCircle2
                  : Info;

              return (
                <div
                  key={n.id}
                  onClick={() => markNotificationAsRead(n.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    n.isRead
                      ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                      : 'bg-slate-950 border-emerald-500/40 text-slate-100 shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-2.5 mb-1">
                    <Icon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        n.severity === 'alert'
                          ? 'text-red-400'
                          : n.severity === 'warning'
                          ? 'text-amber-400'
                          : n.severity === 'success'
                          ? 'text-emerald-400'
                          : 'text-blue-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs leading-tight text-white">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {n.storeName} • {new Date(n.timestamp).toLocaleTimeString('pt-MZ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-6.5">{n.message}</p>

                  <div className="mt-2 pl-6.5 pt-1.5 border-t border-slate-900 text-[10px] flex items-center justify-between text-slate-500">
                    <span className="text-emerald-400 font-medium">Ação: {n.actionRecommended}</span>
                    <span className="font-mono uppercase">{n.deliveryStatus}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
