import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Zap, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import { sound } from '../../services/soundService';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Leitor de Código de Barras por Câmera',
  subtitle = 'Aponte a câmera do telemóvel para o código de barras do produto',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Common Mozambican supermarket product barcodes for quick test on desktop/tablet
  const quickTestCodes = [
    { label: 'Arroz Tio Patrício 5kg', code: '7891005123456' },
    { label: 'Óleo de Cozinha 1L', code: '5601234509876' },
    { label: 'Açúcar Branco 1kg', code: '7896541230012' },
    { label: 'Sabão em Pó OMO', code: '6009532001123' },
    { label: 'Sabão Azul 250g', code: '6009532004411' },
    { label: 'Arroz 25kg Extra', code: '7891005999999' },
    { label: 'Coca-Cola 330ml', code: '5449000000996' },
  ];

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMessage(null);
    setHasCameraPermission(null);
    setIsDetecting(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso à câmera não suportado neste navegador. Use a entrada manual abaixo.');
      }

      // Try environment (rear) camera first for phone/tablets
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS/Safari
        await videoRef.current.play();
        setCameraActive(true);
        setHasCameraPermission(true);

        // Initiate BarcodeDetector loop if supported
        setupNativeBarcodeDetection();
      }
    } catch (err: any) {
      console.warn('Erro ao acessar câmera:', err);
      setHasCameraPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Permissão de câmera negada. Permita o acesso nas configurações do navegador ou use os botões rápidos abaixo.'
          : 'Câmera não detectada ou em uso por outro aplicativo. Digite o código manualmente ou use os botões de teste.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsDetecting(false);
  };

  const setupNativeBarcodeDetection = () => {
    // Check if BarcodeDetector is supported in this browser
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        });

        const detectLoop = async () => {
          if (!videoRef.current || !streamRef.current || !isOpen) return;

          try {
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const scannedValue = barcodes[0].rawValue;
                handleSuccessfulScan(scannedValue);
                return;
              }
            }
          } catch (e) {
            // Frame detection error, continue next frame
          }

          if (streamRef.current && isOpen) {
            requestAnimationFrame(detectLoop);
          }
        };

        requestAnimationFrame(detectLoop);
      } catch (e) {
        // Fallback
      }
    }
  };

  const handleSuccessfulScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    sound.barcodeBeep();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }

    stopCamera();
    onScan(cleanCode);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccessfulScan(manualCode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[360px] flex items-center justify-center overflow-hidden">
          {/* Live Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Scanner Overlay Laser & Target Reticle */}
          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-40 border-2 border-orange-500/80 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.4)] overflow-hidden">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-orange-400 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-orange-400 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-orange-400 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-orange-400 rounded-br-sm" />

                {/* Animated Scanning Laser Line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
              </div>
              <div className="absolute bottom-3 text-center px-4 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white font-medium">
                Alinhe o código de barras no retângulo central
              </div>
            </div>
          )}

          {/* Fallback if camera is unavailable or loading */}
          {!cameraActive && (
            <div className="p-6 text-center max-w-sm space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <Smartphone className="w-7 h-7 text-orange-400 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {errorMessage ? 'Câmera Não Disponível' : 'Iniciando Leitor de Câmera...'}
                </p>
                {errorMessage && (
                  <p className="text-xs text-amber-300 mt-1.5 leading-relaxed">{errorMessage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar Câmera Novamente
              </button>
            </div>
          )}
        </div>

        {/* Quick Mock Scanner & Manual Code Input */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          {/* Quick scan chips */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              Leitura Rápida de Produtos em Moçambique:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickTestCodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSuccessfulScan(item.code)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-orange-600 hover:text-white border border-slate-700 text-slate-200 transition-all font-medium flex items-center gap-1"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[9px] text-slate-400">({item.code.slice(-4)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual input fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-800/80 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ou digite o código de barras manualmente (ex: 7891005123456)..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
            >
              Confirmar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
