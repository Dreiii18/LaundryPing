'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import type { ServicesManagerProps } from './types';

const SERVICE_TYPE_OPTIONS = [
  { value: 'per_load', label: 'Per Load' },
  { value: 'per_kg', label: 'Per Kg' },
  { value: 'fixed', label: 'Fixed' },
] as const;

export function ServicesManager({
  services,
  servicePrices,
  serviceWeights,
  serviceTypes,
  newService,
  newServicePrice,
  newServiceWeight,
  newServiceType,
  onNewServiceChange,
  onNewServicePriceChange,
  onNewServiceWeightChange,
  onNewServiceTypeChange,
  onAddService,
  onRemoveService,
  onUpdateServicePrice,
  onUpdateServiceWeight,
  onUpdateServiceType,
}: ServicesManagerProps) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {services.map((service, index) => {
        const type = serviceTypes[service] ?? 'per_load';
        return (
          <div key={service} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Badge variant="secondary" className="text-sm py-1.5 px-3 gap-1.5 shrink-0">
              {service}
              <button
                type="button"
                onClick={() => onRemoveService(index)}
                className="hover:text-red-600 transition-colors"
                aria-label={`Remove ${service}`}
              >
                <X className="size-3.5" />
              </button>
            </Badge>
            <Select value={type} onValueChange={(val) => onUpdateServiceType(service, val)}>
              <SelectTrigger className="h-8 w-[100px] text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-32">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                ₱
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={servicePrices[service] ?? ''}
                onChange={(e) => onUpdateServicePrice(service, e.target.value)}
                className="h-8 pl-6 text-sm"
                aria-label={`Price for ${service}`}
              />
              {type === 'per_kg' && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                  /kg
                </span>
              )}
            </div>
            {type === 'per_load' && (
              <div className="relative w-24">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={serviceWeights[service] ?? ''}
                  onChange={(e) => onUpdateServiceWeight(service, e.target.value)}
                  className="h-8 pr-7 text-sm"
                  aria-label={`Capacity for ${service}`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                  kg
                </span>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex gap-2 mt-3 flex-wrap sm:flex-nowrap">
        <Input
          value={newService}
          onChange={(e) => onNewServiceChange(e.target.value)}
          placeholder="Service name"
          maxLength={50}
          className="h-10 flex-1 min-w-[120px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddService();
            }
          }}
        />
        <Select value={newServiceType} onValueChange={onNewServiceTypeChange}>
          <SelectTrigger className="h-10 w-[110px] text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-28 shrink-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
            ₱
          </span>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={newServicePrice}
            onChange={(e) => onNewServicePriceChange(e.target.value)}
            className="h-10 pl-6 text-sm"
            aria-label="Price for new service"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddService();
              }
            }}
          />
          {newServiceType === 'per_kg' && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
              /kg
            </span>
          )}
        </div>
        {newServiceType === 'per_load' && (
          <div className="relative w-24 shrink-0">
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={newServiceWeight}
              onChange={(e) => onNewServiceWeightChange(e.target.value)}
              className="h-10 pr-7 text-sm"
              aria-label="Capacity for new service"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddService();
                }
              }}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
              kg
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onAddService}
          disabled={!newService.trim()}
          className="h-10 px-3 shrink-0"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
