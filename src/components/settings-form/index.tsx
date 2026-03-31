'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { useSettingsForm } from './use-settings-form';
import { ServicesManager } from './services-manager';
import type { SettingsFormProps } from './types';

export function SettingsForm(props: SettingsFormProps) {
  const {
    name,
    setName,
    address,
    setAddress,
    contactNumber,
    setContactNumber,
    services,
    servicePrices,
    newService,
    setNewService,
    newServicePrice,
    setNewServicePrice,
    saving,
    hasChanges,
    addService,
    removeService,
    updateServicePrice,
    handleSubmit,
  } = useSettingsForm(props);

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-6 space-y-6">
        <div>
          <Label htmlFor="name" className="text-sm font-semibold text-slate-700 mb-2">
            Laundromat Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Clean & Go"
            maxLength={50}
            required
            className="h-12 min-h-11"
          />
          <p className="text-xs text-slate-400 mt-1">{name.length}/50 characters</p>
        </div>

        <div>
          <Label htmlFor="address" className="text-sm font-semibold text-slate-700 mb-2">
            Business Address
          </Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter full physical address"
            maxLength={200}
            rows={3}
            className="min-h-11"
          />
        </div>

        <div>
          <Label htmlFor="contact-number" className="text-sm font-semibold text-slate-700 mb-2">
            Contact Number
          </Label>
          <Input
            id="contact-number"
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="e.g., 09171234567"
            maxLength={20}
            className="h-12 min-h-11"
          />
          <p className="text-xs text-slate-400 mt-1">Shown on printed receipts</p>
        </div>

        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2">Services Offered</Label>
          <ServicesManager
            services={services}
            servicePrices={servicePrices}
            newService={newService}
            newServicePrice={newServicePrice}
            onNewServiceChange={setNewService}
            onNewServicePriceChange={setNewServicePrice}
            onAddService={addService}
            onRemoveService={removeService}
            onUpdateServicePrice={updateServicePrice}
          />
        </div>
      </div>

      <div className="px-6 pb-6 flex justify-end">
        <Button
          type="submit"
          disabled={saving || !hasChanges}
          className="bg-[#0d968b] hover:bg-[#0d968b]/90 text-white font-bold shadow-md min-h-11"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            <>
              <Save className="size-4" />
              Save Changes
            </>
          ) : (
            <>
              <CheckCircle className="size-4" />
              Saved
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
