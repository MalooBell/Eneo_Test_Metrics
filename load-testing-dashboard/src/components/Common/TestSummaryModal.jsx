import React, { useMemo } from 'react';
import {
  XMarkIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

const TestSummaryModal = ({ 
  isOpen, 
  onClose, 
  initialStats, 
  finalStats, 
  initialSystemStats,
  finalSystemStats,
  testName, 
  testStartTime 
}) => {
  // Calculer les métriques de début et de fin
  const metrics = useMemo(() => {
    if (!initialStats || !finalStats) return null;

    const initialAggregated = initialStats.stats?.find(s => s.name === 'Aggregated') || {};
    const finalAggregated = finalStats.stats?.find(s => s.name === 'Aggregated') || {};

    const initial = {
      avgResponseTime: initialAggregated.avg_response_time || 0,
      requestsPerSecond: initialAggregated.current_rps || 0,
      errorRate: initialAggregated.num_requests > 0 ? 
        (initialAggregated.num_failures / initialAggregated.num_requests) * 100 : 0,
      totalRequests: initialAggregated.num_requests || 0,
      totalFailures: initialAggregated.num_failures || 0
    };

    const final = {
      avgResponseTime: finalAggregated.avg_response_time || 0,
      requestsPerSecond: finalAggregated.current_rps || 0,
      errorRate: finalAggregated.num_requests > 0 ? 
        (finalAggregated.num_failures / finalAggregated.num_requests) * 100 : 0,
      totalRequests: finalAggregated.num_requests || 0,
      totalFailures: finalAggregated.num_failures || 0
    };

    return { initial, final };
  }, [initialStats, finalStats]);

  // Calculer les métriques système de début et de fin
  const systemMetrics = useMemo(() => {
    if (!initialSystemStats || !finalSystemStats) return null;

    // Fonction utilitaire pour traiter les métriques Prometheus
    const processMetricData = (metricData) => {
      if (!metricData || !metricData.data || !metricData.data.result) return [];
      return metricData.data.result;
    };

    // Fonction pour calculer l'utilisation CPU
    const calculateCpuUsage = (systemData) => {
      const cpuData = processMetricData(systemData['rate(node_cpu_seconds_total[5m])']);
      if (!cpuData.length) return 0;
      
      const totalUsage = cpuData.reduce((sum, cpu) => {
        const value = parseFloat(cpu.value[1]);
        return sum + (isNaN(value) ? 0 : value * 100);
      }, 0);
      return Math.round(totalUsage / cpuData.length);
    };

    // Fonction pour calculer l'utilisation mémoire
    const calculateMemoryUsage = (systemData) => {
      const memoryTotal = processMetricData(systemData['node_memory_MemTotal_bytes']);
      const memoryAvailable = processMetricData(systemData['node_memory_MemAvailable_bytes']);
      
      if (!memoryTotal.length || !memoryAvailable.length) return { used: 0, total: 0, percentage: 0 };
      
      const total = parseFloat(memoryTotal[0].value[1]);
      const available = parseFloat(memoryAvailable[0].value[1]);
      const used = total - available;
      const percentage = Math.round((used / total) * 100);
      
      return {
        used: Math.round(used / 1024 / 1024 / 1024 * 10) / 10, // GB
        total: Math.round(total / 1024 / 1024 / 1024 * 10) / 10, // GB
        percentage
      };
    };

    const initial = {
      cpuUsage: calculateCpuUsage(initialSystemStats),
      memoryUsage: calculateMemoryUsage(initialSystemStats)
    };

    const final = {
      cpuUsage: calculateCpuUsage(finalSystemStats),
      memoryUsage: calculateMemoryUsage(finalSystemStats)
    };

    return { initial, final };
  }, [initialSystemStats, finalSystemStats]);

  // Calculer la durée du test
  const testDuration = useMemo(() => {
    if (!testStartTime) return 'N/A';
    
    const endTime = new Date();
    const durationMs = endTime - testStartTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }, [testStartTime]);

  // Fonction pour calculer le changement en pourcentage
  const calculateChange = (initial, final) => {
    if (initial === 0) {
      return { value: final > 0 ? '+∞%' : '0%', trend: final > 0 ? 'up' : 'stable' };
    }
    
    const change = ((final - initial) / initial) * 100;
    const trend = Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down';
    const sign = change > 0 ? '+' : '';
    
    return {
      value: `${sign}${Math.round(change * 10) / 10}%`,
      trend,
      rawChange: change
    };
  };

  // Fonction pour obtenir l'icône de tendance
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

  // Fonction pour obtenir la couleur de tendance
  const getTrendColor = (trend, isErrorMetric = false) => {
    if (trend === 'stable') return 'text-gray-600';
    
    // Pour les métriques d'erreur, une augmentation est mauvaise
    if (isErrorMetric) {
      return trend === 'up' ? 'text-red-600' : 'text-green-600';
    }
    
    // Pour le temps de réponse, une augmentation est mauvaise
    return trend === 'up' ? 'text-red-600' : 'text-green-600';
  };

  if (!isOpen) return null;

  // Si nous n'avons pas les données nécessaires, afficher un message d'erreur
  if (!metrics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6 text-center">
            <ExclamationCircleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Données insuffisantes
            </h3>
            <p className="text-gray-600 mb-4">
              Impossible de générer le résumé du test. Les métriques de début ou de fin sont manquantes.
            </p>
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
  }

  const responseTimeChange = calculateChange(metrics.initial.avgResponseTime, metrics.final.avgResponseTime);
  const rpsChange = calculateChange(metrics.initial.requestsPerSecond, metrics.final.requestsPerSecond);
  const errorRateChange = calculateChange(metrics.initial.errorRate, metrics.final.errorRate);
  
  // Calculer les changements pour les métriques système
  const cpuChange = systemMetrics ? calculateChange(systemMetrics.initial.cpuUsage, systemMetrics.final.cpuUsage) : null;
  const memoryChange = systemMetrics ? calculateChange(systemMetrics.initial.memoryUsage.percentage, systemMetrics.final.memoryUsage.percentage) : null;

  const metricsData = [
    {
      title: 'Temps de réponse moyen',
      icon: ClockIcon,
      initial: `${Math.round(metrics.initial.avgResponseTime)}ms`,
      final: `${Math.round(metrics.final.avgResponseTime)}ms`,
      change: responseTimeChange,
      isErrorMetric: true
    },
    {
      title: 'Requêtes par seconde',
      icon: ChartBarIcon,
      initial: `${Math.round(metrics.initial.requestsPerSecond * 10) / 10}`,
      final: `${Math.round(metrics.final.requestsPerSecond * 10) / 10}`,
      change: rpsChange,
      isErrorMetric: false
    },
    {
      title: 'Taux d\'erreur',
      icon: ExclamationTriangleIcon,
      initial: `${Math.round(metrics.initial.errorRate * 10) / 10}%`,
      final: `${Math.round(metrics.final.errorRate * 10) / 10}%`,
      change: errorRateChange,
      isErrorMetric: true
    }
  ];

  // Métriques système (si disponibles)
  const systemMetricsData = systemMetrics ? [
    {
      title: 'Utilisation CPU',
      icon: CpuChipIcon,
      initial: `${systemMetrics.initial.cpuUsage}%`,
      final: `${systemMetrics.final.cpuUsage}%`,
      change: cpuChange,
      isErrorMetric: true // Une augmentation du CPU est généralement négative
    },
    {
      title: 'Utilisation Mémoire',
      icon: CircleStackIcon,
      initial: `${systemMetrics.initial.memoryUsage.percentage}% (${systemMetrics.initial.memoryUsage.used}GB)`,
      final: `${systemMetrics.final.memoryUsage.percentage}% (${systemMetrics.final.memoryUsage.used}GB)`,
      change: memoryChange,
      isErrorMetric: true // Une augmentation de la mémoire est généralement négative
    }
  ] : [];
  // Déterminer si le test a des problèmes
  const hasPerformanceIssues = responseTimeChange.trend === 'up' || 
                               errorRateChange.trend === 'up' ||
                               (cpuChange && cpuChange.trend === 'up') ||
                               (memoryChange && memoryChange.trend === 'up');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {hasPerformanceIssues ? (
                <ExclamationCircleIcon className="h-8 w-8 text-yellow-500" />
              ) : (
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Résumé du Test Terminé
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {testName || 'Test sans nom'}
                </p>
              </div>
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
                <span className="font-medium ml-2">{testDuration}</span>
              </div>
              <div>
                <span className="text-gray-500">Utilisateurs:</span>
                <span className="font-medium ml-2">{finalStats?.user_count || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Total requêtes:</span>
                <span className="font-medium ml-2">
                  {metrics.final.totalRequests.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total échecs:</span>
                <span className="font-medium ml-2">
                  {metrics.final.totalFailures.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Comparatif des métriques */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Évolution des Performances de l'Application
            </h4>
            <div className="space-y-4">
              {metricsData.map((metric, index) => {
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
                        getTrendColor(metric.change.trend, metric.isErrorMetric)
                      )}>
                        {getTrendIcon(metric.change.trend)}
                        <span>{metric.change.value}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-center">
                        <div className="text-gray-500">Début</div>
                        <div className="font-semibold text-gray-900">{metric.initial}</div>
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
                        <div className="font-semibold text-gray-900">{metric.final}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Métriques système */}
          {systemMetrics && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Impact sur le Système
              </h4>
              <div className="space-y-4">
                {systemMetricsData.map((metric, index) => {
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
                          getTrendColor(metric.change.trend, metric.isErrorMetric)
                        )}>
                          {getTrendIcon(metric.change.trend)}
                          <span>{metric.change.value}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-center">
                          <div className="text-gray-500">Début</div>
                          <div className="font-semibold text-gray-900">{metric.initial}</div>
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
                          <div className="font-semibold text-gray-900">{metric.final}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommandations */}
          {hasPerformanceIssues && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-2 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                Recommandations
              </h5>
              <ul className="text-sm text-yellow-700 space-y-1">
                {responseTimeChange.trend === 'up' && (
                  <li>• Les temps de réponse ont augmenté, considérez l'optimisation des performances</li>
                )}
                {errorRateChange.trend === 'up' && (
                  <li>• Le taux d'erreur a augmenté, vérifiez la stabilité de l'application</li>
                )}
                {cpuChange && cpuChange.trend === 'up' && (
                  <li>• L'utilisation CPU a augmenté, considérez l'optimisation des ressources serveur</li>
                )}
                {memoryChange && memoryChange.trend === 'up' && (
                  <li>• L'utilisation mémoire a augmenté, surveillez les fuites mémoire potentielles</li>
                )}
                <li>• Analysez les logs pour identifier les goulots d'étranglement</li>
                <li>• Considérez une montée en charge plus progressive</li>
              </ul>
            </div>
          )}

          {/* Message de succès */}
          {!hasPerformanceIssues && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h5 className="font-medium text-green-800 mb-2 flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Test Réussi
              </h5>
              <p className="text-sm text-green-700">
                Les performances de l'application et du système sont restées stables ou se sont améliorées pendant le test. 
                Votre infrastructure gère bien la charge testée.
              </p>
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