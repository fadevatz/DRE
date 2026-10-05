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

export default function ChartsView({ chartData, activeTab, onTabChange, regime }) {
  const timeline = chartData?.timeline || [];
  const distribution = chartData?.distribution || [];

  const lineLabels = timeline.map(t => t.label);
  const lineValues = timeline.map(t => t.data);

  const lineChartData = {
    labels: lineLabels.length > 0 ? lineLabels : ['01/10', '02/10', '03/10', '04/10', '05/10'],
    datasets: [
      {
        label: `Volume de Despesas (${regime === 'caixa' ? 'Caixa' : 'Competência'})`,
        data: lineValues.length > 0 ? lineValues : [0, 0, 0, 0, 0],
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

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Abas Superiores Idênticas à Imagem */}
      <div className="border-b border-slate-200 px-6 flex items-center gap-8">
        <button
          onClick={() => onTabChange('tendencia')}
          className={`py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'tendencia'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tendência de Despesas
        </button>
        <button
          onClick={() => onTabChange('distribuicao')}
          className={`py-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'distribuicao'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Distribuição por Plano de Contas
        </button>
      </div>

      {/* Conteúdo do Gráfico e Coluna Lateral */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lado Esquerdo: Gráfico Temporal */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-slate-700 mb-4">
              Volume por Período ({regime === 'caixa' ? 'Data de Pagamento' : 'Data de Competência'})
            </h4>
            <div className="h-[280px] w-full">
              <Line data={lineChartData} options={lineOptions} />
            </div>
          </div>

          {/* Lado Direito: Ranking / Distribuição (Como na imagem "Ranking por Máquina") */}
          <div className="border-t lg:border-t-0 lg:border-l lg:border-slate-200 lg:pl-8 pt-6 lg:pt-0">
            <h4 className="text-sm font-bold text-slate-700 mb-4">
              Ranking por Categoria
            </h4>
            <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
              {distribution.length > 0 ? (
                distribution.map((item, idx) => {
                  const maxVal = Math.max(...distribution.map(d => d.value), 1);
                  const pct = (item.value / maxVal) * 100;
                  return (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-700 truncate max-w-[160px]" title={item.label}>
                          {idx + 1}. {item.label}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatMoney(item.value)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum dado para o período.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

