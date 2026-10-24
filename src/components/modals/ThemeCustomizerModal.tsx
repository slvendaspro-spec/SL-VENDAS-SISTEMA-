import React from 'react';
import { X, Check, Palette, Type, Layout, ShieldCheck, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { APP_THEMES } from '../../data/themes';
import { AppThemeId, AppFontFamily, CashierLayoutMode } from '../../types';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose }) => {
  const {
    appTheme,
    setAppTheme,
    appFont,
    setAppFont,
    cashierLayoutMode,
    setCashierLayoutMode,
    activeThemeConfig,
    isSemSangria,
    setIsSemSangria,
    includeIVA,
    setIncludeIVA,
  } = useStore();

  if (!isOpen) return null;

  const fontOptions: { id: AppFontFamily; name: string; desc: string; sample: string }[] = [
    {
      id: 'jakarta',
      name: 'Plus Jakarta Sans (Moderna / Padrão)',
      desc: 'Alta legibilidade para ecrãs de computador e telemóvel',
      sample: 'SL VENDAS 1.269,45 MZN',
    },
    {
      id: 'mono',
      name: 'JetBrains Mono (Técnica / Código de Barras)',
      desc: 'Estilo terminal com dígitos perfeitamente alinhados',
      sample: '7891005123456 • 450.00 MZN',
    },
    {
      id: 'condensed',
      name: 'Barlow Semi-Condensed (Compacta / Retalho)',
      desc: 'Mais produtos visíveis por linha em telas pequenas',
      sample: 'ARROZ TIO PATRÍCIO 5KG x2',
    },
    {
      id: 'bold_retail',
      name: 'Montserrat Bold (Varejo & Supermercado)',
      desc: 'Títulos expressivos de impacto visual para mini-mercados',
      sample: 'TOTAL A PAGAR: 1.269,45 MZN',
    },
  ];

  const layoutOptions: { id: CashierLayoutMode; name: string; desc: string; tag: string }[] = [
    {
      id: 'computador_3col',
      name: 'Computador (3 Colunas Profissional)',
      desc: '1. Lista de Produtos • 2. Resumo da Compra & Pagamento • 3. Funções do Sistema (Manual Técnico)',
      tag: '1024px+',
    },
    {
      id: 'tablet_keypad',
      name: 'Tablet (2 Colunas com Teclado Numérico)',
      desc: 'Teclado numérico táctil integrado ao lado da lista de produtos',
      tag: '768px+',
    },
    {
      id: 'celular_1col',
      name: 'Celular (Layout Vertical 1 Coluna)',
      desc: 'Elementos empilhados e optimizados para toque no telemóvel Android/iOS',
      tag: '320px+',
    },
    {
      id: 'passo_a_passo',
      name: 'Modo Passo a Passo (1 ao 5 Guiado)',
      desc: '1. Bipar • 2. Adicionar Itens • 3. Resumo & IVA • 4. Pagamento • 5. Fechar Caixa & Talão',
      tag: 'Tutorial',
    },
    {
      id: 'grade_catalogo',
      name: 'Catálogo Visual em Grade',
      desc: 'Cartões com imagens, nomes e botões de adicionar rápido',
      tag: 'Grade',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center shadow">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Personalização Visual: Temas, Cores e Letras
              </h2>
              <p className="text-xs text-slate-400">
                Seleção de temas com base no padrão fotográfico do PDV Moçambique
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6 my-4 pr-1">
          {/* SECTION 1: 15 THEMES CARDS (EXACT MATCH TO USER SCREENSHOT!) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-orange-400" />
                <span>Modelos de Temas & Cores ({Object.keys(APP_THEMES).length} Opções)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Tema Ativo: <strong className="text-orange-400">{activeThemeConfig.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.values(APP_THEMES).map((th) => {
                const isSelected = appTheme === th.id;

                return (
                  <button
                    key={th.id}
                    onClick={() => setAppTheme(th.id)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'border-orange-500 bg-slate-800/90 shadow-xl shadow-orange-950/40 ring-1 ring-orange-500'
                        : 'border-slate-700/80 bg-slate-950/80 hover:border-slate-500 hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Dual Color Swatch Boxes matching the screenshot */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div
                        className="w-1/2 h-8 rounded-lg shadow-sm border border-white/10"
                        style={{ backgroundColor: th.color1 }}
                      />
                      <div
                        className="w-1/2 h-8 rounded-lg shadow-sm border border-white/10"
                        style={{ backgroundColor: th.color2 }}
                      />
                    </div>

                    <div>
                      <p className="font-bold text-xs text-white leading-tight mb-1">{th.name}</p>
                      <span
                        className={`text-[10px] font-semibold flex items-center gap-1 ${
                          isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Selecionado</span>
                          </>
                        ) : (
                          'Ativar'
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: TYPOGRAPHY / LETRAS */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Type className="w-4 h-4 text-orange-400" />
              <span>Tipografia do Sistema (Estilo de Letras)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fontOptions.map((font) => {
                const isSelected = appFont === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => setAppFont(font.id)}
                    className={`p-3.5 rounded-2xl border transition-all text-left flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-orange-500 shadow'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{font.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{font.desc}</p>
                      <div className="mt-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-400">
                        {font.sample}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: LAYOUT DO PDV (COMPUTADOR / TABLET / CELULAR / PASSO A PASSO) */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layout className="w-4 h-4 text-orange-400" />
              <span>Modo de Exibição do PDV Caixa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {layoutOptions.map((lay) => {
                const isSelected = cashierLayoutMode === lay.id;
                return (
                  <button
                    key={lay.id}
                    onClick={() => setCashierLayoutMode(lay.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-800 border-orange-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-xs text-white">{lay.name}</p>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-orange-400 border border-slate-700">
                        {lay.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{lay.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: REGRAS OPERACIONAIS DAS FOTOS (SEM SANGRIA & IVA 17%) */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Diretrizes Operacionais de Moçambique</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">PDV Sem Sangria (Recomendado)</p>
                  <p className="text-[11px] text-slate-400">
                    A gaveta de dinheiro só se abre ao Fechar Caixa, garantindo maior controlo diário
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isSemSangria}
                  onChange={(e) => setIsSemSangria(e.target.checked)}
                  className="w-5 h-5 accent-orange-500 cursor-pointer ml-3 shrink-0"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Cálculo de IVA (17%)</p>
                  <p className="text-[11px] text-slate-400">
                    Calcula e discrimina automaticamente o IVA conforme a legislação tributária de Moçambique
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={includeIVA}
                  onChange={(e) => setIncludeIVA(e.target.checked)}
                  className="w-5 h-5 accent-orange-500 cursor-pointer ml-3 shrink-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            As alterações são aplicadas e salvas em tempo real.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors shadow-lg cursor-pointer"
          >
            Concluir & Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
