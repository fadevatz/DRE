import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { PieChart, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function formatMoney(value) {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function ChartsView({ chartData, activeTab = 'tendencia', onTabChange, regime }) {
  const timeline = chartData?.timeline || [];
  const distribution = chartData?.distribution || [];

  // Dados para Gráfico de Linha (Tendência)
  const lineLabels = timeline.map(t => t.label);
  const lineValues = timeline.map(t => t.data);

  const lineChartData = {
    labels: lineLabels.length > 0 ? lineLabels : ['Sem dados'],
    datasets: [
      {
        label: `Despesas (${regime === 'caixa' ? 'Caixa' : 'Competência'})`,
        data: lineValues.length > 0 ? lineValues : [0],
        borderColor: '#1877f2',
        backgroundColor: 'rgba(24, 119, 242, 0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#1877f2',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        callbacks: {
          label: function(context) {
            return ` Valor: ${formatMoney(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
          drawBorder: false
        },
        ticks: {
          font: { size: 11 },
          color: '#64748b',
          callback: function(value) {
            return formatMoney(value);
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 11 },
          color: '#64748b'
        }
      }
    }
  };

  // Dados para Gráfico de Barras (Distribuição por Plano de Contas)
  // Truncar labels muito longos para exibição no eixo X
  const barLabels = distribution.map(d => {
    const raw = d.label || 'Outros';
    return raw.length > 28 ? raw.substring(0, 26) + '...' : raw;
  });
  const barValues = distribution.map(d => d.value);

  // Paleta de cores para as barras
  const barColors = [
    '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'
  ];

  const barChartData = {
    labels: barLabels.length > 0 ? barLabels : ['Sem dados'],
    datasets: [
      {
        label: 'Total Despesa',
        data: barValues.length > 0 ? barValues : [0],
        backgroundColor: barColors.slice(0, barLabels.length),
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        callbacks: {
          title: function(items) {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            return distribution[idx]?.label || items[0].label;
          },
          label: function(context) {
            const totalGeral = distribution.reduce((acc, cur) => acc + cur.value, 0);
            const val = context.raw || 0;
            const pct = totalGeral > 0 ? ((val / totalGeral) * 100).toFixed(1) : 0;
            return ` Despesa: ${formatMoney(val)} (${pct}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
          drawBorder: false
        },
        ticks: {
          font: { size: 11 },
          color: '#64748b',
          callback: function(value) {
            return formatMoney(value);
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 10 },
          color: '#64748b',
          maxRotation: 45,
          minRotation: 20
        }
      }
    }
  };

  const totalDistribuicao = distribution.reduce((acc, cur) => acc + (cur.value || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Abas Superiores Idênticas à Imagem */}
      <div className="border-b border-slate-200 px-6 flex items-center gap-8">
        <button
          onClick={() => onTabChange('tendencia')}
          className={`py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'tendencia'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Tendência de Despesas</span>
        </button>
        <button
          onClick={() => onTabChange('distribuicao')}
          className={`py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'distribuicao'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Distribuição por Plano de Contas</span>
        </button>
      </div>

      {/* Conteúdo do Gráfico e Coluna Lateral */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lado Esquerdo: Gráfico Ativo (Linha ou Barras conforme a aba selecionada) */}
          <div className="lg:col-span-2">
            {activeTab === 'tendencia' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-700">
                    Volume Temporal ({regime === 'caixa' ? 'Data de Pagamento' : 'Data de Competência'})
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">
                    {timeline.length} dias apurados
                  </span>
                </div>
                <div className="h-[300px] w-full">
                  <Line data={lineChartData} options={lineOptions} />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-700">
                    Distribuição das Maiores Contas ({regime === 'caixa' ? 'Caixa' : 'Competência'})
                  </h4>
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold border border-blue-100">
                    Total: {formatMoney(totalDistribuicao)}
                  </span>
                </div>
                <div className="h-[300px] w-full">
                  <Bar data={barChartData} options={barOptions} />
                </div>
              </>
            )}
          </div>

          {/* Lado Direito: Ranking / Distribuição com Barra de Progresso */}
          <div className="border-t lg:border-t-0 lg:border-l lg:border-slate-200 lg:pl-8 pt-6 lg:pt-0">
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center justify-between">
              <span>Ranking por Plano de Contas</span>
              <span className="text-[11px] font-normal text-slate-400">{distribution.length} contas</span>
            </h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {distribution.length > 0 ? (
                distribution.map((item, idx) => {
                  const maxVal = Math.max(...distribution.map(d => d.value), 1);
                  const pctRelativo = (item.value / maxVal) * 100;
                  const pctTotal = totalDistribuicao > 0 ? ((item.value / totalDistribuicao) * 100).toFixed(1) : 0;
                  return (
                    <div key={idx} className="group hover:bg-slate-50/80 p-1.5 rounded-lg transition-colors">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-700 truncate max-w-[170px]" title={item.label}>
                          {idx + 1}. {item.label}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-900 block leading-tight">
                            {formatMoney(item.value)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {pctTotal}% do total
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 group-hover:bg-blue-700 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pctRelativo}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                  <AlertCircle className="w-5 h-5 text-slate-300" />
                  <span>Nenhum dado encontrado para o filtro selecionado.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
