import React, { useState, useCallback } from 'react';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

const ScenarioBuilder = ({ scenarios, onScenariosChange, disabled = false }) => {
  const [expandedScenarios, setExpandedScenarios] = useState(new Set([0])); // Premier scénario ouvert par défaut

  // Validation JSON en temps réel
  const validateJSON = useCallback((jsonString) => {
    if (!jsonString.trim()) return { isValid: true, error: null };
    
    try {
      JSON.parse(jsonString);
      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }, []);

  const toggleScenario = (index) => {
    const newExpanded = new Set(expandedScenarios);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedScenarios(newExpanded);
  };

  const addScenario = () => {
    const newScenario = {
      name: `Scénario ${scenarios.length + 1}`,
      method: 'GET',
      endpoint: '/',
      payload: '',
      weight: 1
    };
    
    const newScenarios = [...scenarios, newScenario];
    onScenariosChange(newScenarios);
    
    // Ouvrir automatiquement le nouveau scénario
    setExpandedScenarios(prev => new Set([...prev, scenarios.length]));
  };

  const removeScenario = (index) => {
    if (scenarios.length <= 1) return; // Garder au moins un scénario
    
    const newScenarios = scenarios.filter((_, i) => i !== index);
    onScenariosChange(newScenarios);
    
    // Ajuster les scénarios ouverts
    const newExpanded = new Set();
    expandedScenarios.forEach(i => {
      if (i < index) newExpanded.add(i);
      else if (i > index) newExpanded.add(i - 1);
    });
    setExpandedScenarios(newExpanded);
  };

  const duplicateScenario = (index) => {
    const scenarioToDuplicate = { ...scenarios[index] };
    scenarioToDuplicate.name = `${scenarioToDuplicate.name} (copie)`;
    
    const newScenarios = [
      ...scenarios.slice(0, index + 1),
      scenarioToDuplicate,
      ...scenarios.slice(index + 1)
    ];
    onScenariosChange(newScenarios);
    
    // Ouvrir le scénario dupliqué
    setExpandedScenarios(prev => new Set([...prev, index + 1]));
  };

  const moveScenario = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scenarios.length) return;
    
    const newScenarios = [...scenarios];
    [newScenarios[index], newScenarios[newIndex]] = [newScenarios[newIndex], newScenarios[index]];
    onScenariosChange(newScenarios);
    
    // Ajuster les scénarios ouverts
    const newExpanded = new Set();
    expandedScenarios.forEach(i => {
      if (i === index) newExpanded.add(newIndex);
      else if (i === newIndex) newExpanded.add(index);
      else newExpanded.add(i);
    });
    setExpandedScenarios(newExpanded);
  };

  const updateScenario = (index, field, value) => {
    const newScenarios = [...scenarios];
    newScenarios[index] = { ...newScenarios[index], [field]: value };
    onScenariosChange(newScenarios);
  };

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Scénarios de Test ({scenarios.length})
        </h3>
        <button
          type="button"
          onClick={addScenario}
          disabled={disabled}
          className="btn-primary text-sm"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter un scénario
        </button>
      </div>

      <div className="space-y-3">
        {scenarios.map((scenario, index) => {
          const isExpanded = expandedScenarios.has(index);
          const jsonValidation = scenario.payload ? validateJSON(scenario.payload) : { isValid: true, error: null };
          const showPayload = scenario.method === 'POST' || scenario.method === 'PUT';

          return (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* En-tête du scénario */}
              <div 
                className={cn(
                  "flex items-center justify-between p-4 cursor-pointer transition-colors",
                  isExpanded ? "bg-primary-50 border-b border-gray-200" : "bg-gray-50 hover:bg-gray-100"
                )}
                onClick={() => toggleScenario(index)}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    isExpanded ? "bg-primary-600 text-white" : "bg-gray-300 text-gray-700"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{scenario.name}</span>
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        scenario.method === 'GET' ? "bg-blue-100 text-blue-800" :
                        scenario.method === 'POST' ? "bg-green-100 text-green-800" :
                        scenario.method === 'PUT' ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {scenario.method}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {scenario.endpoint} • Poids: {scenario.weight}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!jsonValidation.isValid && (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" title="JSON invalide" />
                  )}
                  {jsonValidation.isValid && showPayload && scenario.payload && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" title="JSON valide" />
                  )}
                  <ChevronUpIcon className={cn(
                    "h-5 w-5 text-gray-400 transition-transform",
                    isExpanded ? "transform rotate-180" : ""
                  )} />
                </div>
              </div>

              {/* Contenu du scénario */}
              {isExpanded && (
                <div className="p-4 bg-white space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nom du scénario */}
                    <div>
                      <label className="label">Nom du scénario *</label>
                      <input
                        type="text"
                        value={scenario.name}
                        onChange={(e) => updateScenario(index, 'name', e.target.value)}
                        disabled={disabled}
                        className="input"
                        placeholder="Ex: Login utilisateur"
                      />
                    </div>

                    {/* Méthode HTTP */}
                    <div>
                      <label className="label">Méthode HTTP *</label>
                      <select
                        value={scenario.method}
                        onChange={(e) => updateScenario(index, 'method', e.target.value)}
                        disabled={disabled}
                        className="input"
                      >
                        {httpMethods.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>

                    {/* Endpoint */}
                    <div>
                      <label className="label">Endpoint *</label>
                      <input
                        type="text"
                        value={scenario.endpoint}
                        onChange={(e) => updateScenario(index, 'endpoint', e.target.value)}
                        disabled={disabled}
                        className="input"
                        placeholder="Ex: /api/login"
                      />
                    </div>

                    {/* Poids */}
                    <div>
                      <label className="label">Poids</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={scenario.weight}
                        onChange={(e) => updateScenario(index, 'weight', parseInt(e.target.value) || 1)}
                        disabled={disabled}
                        className="input"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Fréquence relative d'exécution (1-100)
                      </p>
                    </div>
                  </div>

                  {/* Payload (uniquement pour POST et PUT) */}
                  {showPayload && (
                    <div>
                      <label className="label">
                        Payload JSON {scenario.method === 'POST' ? '(optionnel)' : '(optionnel)'}
                      </label>
                      <div className="relative">
                        <textarea
                          value={scenario.payload}
                          onChange={(e) => updateScenario(index, 'payload', e.target.value)}
                          disabled={disabled}
                          className={cn(
                            "input min-h-[120px] font-mono text-sm",
                            !jsonValidation.isValid && "border-red-300 focus:border-red-500 focus:ring-red-500"
                          )}
                          placeholder='{\n  "email": "user@example.com",\n  "password": "password123"\n}'
                        />
                        {!jsonValidation.isValid && (
                          <div className="absolute top-2 right-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                          </div>
                        )}
                      </div>
                      {!jsonValidation.isValid && (
                        <p className="text-sm text-red-600 mt-1 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          JSON invalide: {jsonValidation.error}
                        </p>
                      )}
                      {jsonValidation.isValid && scenario.payload && (
                        <p className="text-sm text-green-600 mt-1 flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          JSON valide
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => moveScenario(index, 'up')}
                        disabled={disabled || index === 0}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Déplacer vers le haut"
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveScenario(index, 'down')}
                        disabled={disabled || index === scenarios.length - 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Déplacer vers le bas"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateScenario(index)}
                        disabled={disabled}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Dupliquer"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeScenario(index)}
                      disabled={disabled || scenarios.length <= 1}
                      className="flex items-center space-x-2 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Supprimer le scénario"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="text-sm">Supprimer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun scénario configuré.</p>
          <button
            type="button"
            onClick={addScenario}
            disabled={disabled}
            className="btn-primary mt-2"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Ajouter le premier scénario
          </button>
        </div>
      )}
    </div>
  );
};

export default ScenarioBuilder;