import React from 'react';
import {
  XMarkIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

const TestSummaryModal = ({ isOpen, onClose, testSummary }) => {
  if (!isOpen || !testSummary) return null;

  const formatValue = (value, unit = '') => {
    if (value == null || isNaN(value)) return 'N/A';
    return `${Math.round(value * 100) / 100}${unit}`;
  };

  const formatPercentageChange = (start, end) => {
    if (start == null || end == null || start === 0) return { value: 'N/A', trend: 'stable' };
    
    const change = ((end - start) / start) * 100;
    const trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    const sign = change > 0 ? '+' : '';
    
    return {
      value: `${sign}${Math.round(change * 10) / 10}%`,
      trend,
      rawChange: change
    };
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4" />;
      default:
        return <MinusIcon className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend, isErrorMetric = false) => {
    if (trend === 'stable') return 'text-gray-600';
    
    // Pour les métriques d'erreur, une augmentation est mauvaise
    if (isErrorMetric) {
      return trend === 'up' ? 'text-red-600' : 'text-green-600';
    }
    
    // Pour les autres métriques, une augmentation peut être bonne ou mauvaise selon le contexte
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const responseTimeChange = formatPercentageChange(
    testSummary.startMetrics?.avgResponseTime,
    testSummary.endMetrics?.avgResponseTime
  );

  const rpsChange = formatPercentageChange(
    testSummary.startMetrics?.requestsPerSecond,
    testSummary.endMetrics?.requestsPerSecond
  );

  const errorRateChange = formatPercentageChange(
    testSummary.startMetrics?.errorRate,
    testSummary.endMetrics?.errorRate
  );

  const metrics = [
    {
      title: 'Temps de réponse moyen',
      icon: ClockIcon,
      start: formatValue(testSummary.startMetrics?.avgResponseTime, 'ms'),
      end: formatValue(testSummary.endMetrics?.avgResponseTime, 'ms'),
      change: responseTimeChange,
      isErrorMetric: true // Une augmentation du temps de réponse est mauvaise
    },
    {
      title: 'Requêtes par seconde',
      icon: ChartBarIcon,
      start: formatValue(testSummary.startMetrics?.requestsPerSecond, ' req/s'),
      end: formatValue(testSummary.endMetrics?.requestsPerSecond, ' req/s'),
      change: rpsChange,
      isErrorMetric: false
    },
    {
      title: 'Taux d\'erreur',
      icon: ExclamationTriangleIcon,
      start: formatValue(testSummary.startMetrics?.errorRate, '%'),
      end: formatValue(testSummary.endMetrics?.errorRate, '%'),
      change: errorRateChange,
      isErrorMetric: true
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Résumé du Test Terminé
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {testSummary.testName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto">
          {/* Informations générales */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-3">
              Informations Générales
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Durée du test:</span>
                <span className="font-medium ml-2">{testSummary.duration}</span>
              </div>
              <div>
                <span className="text-gray-500">Utilisateurs:</span>
                <span className="font-medium ml-2">{testSummary.users}</span>
              </div>
              <div>
                <span className="text-gray-500">Statut final:</span>
                <span className={cn(
                  "font-medium ml-2 px-2 py-1 rounded text-xs",
                  testSummary.finalStatus === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                )}>
                  {testSummary.finalStatus === 'completed' ? 'Terminé' : 'Arrêté'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total requêtes:</span>
                <span className="font-medium ml-2">
                  {testSummary.endMetrics?.totalRequests?.toLocaleString() || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Comparatif des métriques */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Évolution des Performances
            </h4>
            <div className="space-y-4">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{metric.title}</span>
                      </div>
                      <div className={cn(
                        "flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium",
                        getTrendColor(metric.change.trend, metric.isErrorMetric),
                        metric.change.trend === 'up' ? 'bg-red-50' :
                        metric.change.trend === 'down' ? 'bg-green-50' : 'bg-gray-50'
                      )}>
                        {getTrendIcon(metric.change.trend)}
                        <span>{metric.change.value}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-center">
                        <div className="text-gray-500">Début</div>
                        <div className="font-semibold text-gray-900">{metric.start}</div>
                      </div>
                      
                      <div className="flex-1 mx-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              metric.change.trend === 'up' && metric.isErrorMetric ? 'bg-red-400' :
                              metric.change.trend === 'down' && metric.isErrorMetric ? 'bg-green-400' :
                              metric.change.trend === 'up' ? 'bg-green-400' :
                              metric.change.trend === 'down' ? 'bg-red-400' : 'bg-gray-400'
                            )}
                            style={{ 
                              width: `${Math.min(100, Math.abs(metric.change.rawChange || 0) * 2)}%` 
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-gray-500">Fin</div>
                        <div className="font-semibold text-gray-900">{metric.end}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommandations */}
          {(responseTimeChange.trend === 'up' || errorRateChange.trend === 'up') && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-2">Recommandations</h5>
              <ul className="text-sm text-yellow-700 space-y-1">
                {responseTimeChange.trend === 'up' && (
                  <li>• Les temps de réponse ont augmenté, considérez l'optimisation des performances</li>
                )}
                {errorRateChange.trend === 'up' && (
                  <li>• Le taux d'erreur a augmenté, vérifiez la stabilité de l'application</li>
                )}
                <li>• Analysez les logs pour identifier les goulots d'étranglement</li>
              </ul>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestSummaryModal;