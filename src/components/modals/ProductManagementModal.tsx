import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Package,
  Camera,
  Upload,
  Barcode,
  Store as StoreIcon,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { CameraBarcodeScanner } from '../common/CameraBarcodeScanner';
import { sound } from '../../services/soundService';

interface ProductManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductManagementModal: React.FC<ProductManagementModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { stores, addProduct, updateProduct } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Alimentos & Mercearia');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [minStock, setMinStock] = useState('10');
  const [supplier, setSupplier] = useState('');
  const [unit, setUnit] = useState('Unid');
  const [imageUrl, setImageUrl] = useState('');
  const [stockByStore, setStockByStore] = useState<Record<string, number>>({});
  const [isVisibleInCashier, setIsVisibleInCashier] = useState<boolean>(true);
  const [visibleInStores, setVisibleInStores] = useState<Record<string, boolean>>({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCode(productToEdit.code);
      setCategory(productToEdit.category);
      setCostPrice(productToEdit.costPrice.toString());
      setSalePrice(productToEdit.salePrice.toString());
      setMinStock(productToEdit.minStock.toString());
      setSupplier(productToEdit.supplier || '');
      setUnit(productToEdit.unit || 'Unid');
      setImageUrl(productToEdit.imageUrl || '');
      setStockByStore({ ...productToEdit.stockByStore });
      setIsVisibleInCashier(productToEdit.isVisibleInCashier !== false);
      setVisibleInStores({ ...(productToEdit.visibleInStores || {}) });
    } else {
      setName('');
      setCode(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('Alimentos & Mercearia');
      setCostPrice('');
      setSalePrice('');
      setMinStock('10');
      setSupplier('');
      setUnit('Unid');
      setImageUrl('');
      setIsVisibleInCashier(true);
      // Initialize stock and visibility for all stores
      const initialStock: Record<string, number> = {};
      const initialVis: Record<string, boolean> = {};
      stores.forEach((s) => {
        initialStock[s.id] = 20;
        initialVis[s.id] = true;
      });
      setStockByStore(initialStock);
      setVisibleInStores(initialVis);
    }
    setImageError(null);
  }, [productToEdit, stores, isOpen]);

  if (!isOpen) return null;

  // Calculate total stock automatically from all stores
  const totalStockQuantity = Object.values(stockByStore).reduce((a, b) => (a || 0) + (b || 0), 0);

  const handleStockChange = (storeId: string, val: string) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setStockByStore((prev) => ({
      ...prev,
      [storeId]: qty,
    }));
  };

  // Image Upload with 5MB support
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setImageError('A imagem excede 10MB. Selecione uma imagem menor.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
        setImageError(null);
        sound.beep();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cost = parseFloat(costPrice) || 0;
    const sale = parseFloat(salePrice) || 0;
    const min = parseInt(minStock, 10) || 5;

    if (productToEdit) {
      updateProduct(productToEdit.id, {
        name,
        code,
        category,
        costPrice: cost,
        salePrice: sale,
        minStock: min,
        supplier,
        unit,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80',
        stockQuantity: totalStockQuantity,
        stockByStore,
        isVisibleInCashier,
        visibleInStores,
      });
    } else {
      addProduct({
        name,
        code,
        category,
        costPrice: cost,
        salePrice: sale,
        minStock: min,
        supplier,
        unit,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80',
        stockQuantity: totalStockQuantity,
        stockByStore,
        isVisibleInCashier,
        visibleInStores,
      });
    }

    sound.success();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
        <div className="w-full max-w-2xl bg-slate-900 border border-blue-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                {productToEdit ? 'Editar Produto do Catálogo' : 'Adicionar Novo Produto / Serviço'}
              </h3>
              <p className="text-xs text-slate-400">
                Cadastro manual com foto (mínimo 5MB suportado), câmera de código de barras e estoque em todas as lojas
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Image Upload / Camera Area */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt="Foto do Produto" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-10 h-10 text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-bold text-white block mb-0.5">Imagem do Produto (Mínimo 5MB suportado)</span>
                <p className="text-[11px] text-slate-400 mb-2">
                  Carregue uma foto nítida do produto ou tire uma foto com a câmera do celular.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Imagem (5MB+)</span>
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-red-400 hover:text-red-300 text-[11px]"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {imageError && <p className="text-red-400 text-[10px] mt-1">{imageError}</p>}
              </div>
            </div>

            {/* Product Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Arroz Dona Ana 25Kg"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Categoria</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Mercearia"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Code / Barcode with Camera button and manual typing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Código / Código de Barras</label>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Ler com Câmera</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Digitar código manualmente ou usar câmera..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none font-mono focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-400"
                    title="Abrir Câmera de Código de Barras"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Unid">Unid</option>
                    <option value="Kg">Kg</option>
                    <option value="Caixa">Caixa</option>
                    <option value="Litro">Litro</option>
                    <option value="Serviço">Serviço</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Prices in Meticais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Preço de Custo (MZN)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Preço de Venda (MZN)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold outline-none focus:border-blue-500"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-slate-400 mb-1">Fornecedor Opcional</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ex: Distribuidora Moçambique"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                />
              </div>
            </div>

            {/* Habilitar Produto para Estar Visível no Caixa (PDV) */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Habilitar Produto para Estar Visível no Caixa (PDV)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Quando desabilitado, o produto não aparecerá nas buscas nem no catálogo dos operadores de caixa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVisibleInCashier(!isVisibleInCashier)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center shrink-0 ${
                  isVisibleInCashier
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                    : 'bg-red-950 text-red-400 border-red-500/40'
                }`}
              >
                {isVisibleInCashier ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Visível no Caixa</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-red-400" />
                    <span>Oculto no Caixa</span>
                  </>
                )}
              </button>
            </div>

            {/* Multi-Store Stock Distribution: Explicitly requested in prompt */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <StoreIcon className="w-4 h-4 text-blue-400" />
                    <span>Estoque e Visibilidade por Loja</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Defina a quantidade de estoque e se o produto fica visível no caixa de cada filial:
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Estoque Total</span>
                  <span className="font-mono font-black text-sm text-emerald-400">
                    {totalStockQuantity} {unit}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {stores.map((s) => {
                  const qty = stockByStore[s.id] ?? 0;
                  const isVisibleInStore = visibleInStores[s.id] ?? true;
                  return (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="truncate flex-1">
                        <span className="font-bold text-white text-xs truncate block">{s.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{s.city}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleInStores((prev) => ({
                                ...prev,
                                [s.id]: !isVisibleInStore,
                              }))
                            }
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                              isVisibleInStore
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-950/80 text-red-400 border-red-500/40'
                            }`}
                          >
                            {isVisibleInStore ? 'Caixa ON' : 'Caixa OFF'}
                          </button>
                        </div>
                      </div>
                      <div className="w-24 shrink-0">
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => handleStockChange(s.id, e.target.value)}
                          className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-center font-mono font-bold text-white text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase shadow-lg shadow-blue-900/40"
              >
                {productToEdit ? 'Atualizar Produto' : 'Cadastrar Produto'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Barcode Scanner Modal using Camera */}
      <CameraBarcodeScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={(detected) => {
          setCode(detected);
          sound.beep();
          setIsCameraOpen(false);
        }}
      />
    </>
  );
};
