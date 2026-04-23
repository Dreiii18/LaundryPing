'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    serviceWeights,
    serviceTypes,
    rushFee,
    setRushFee,
    receiptPaperSize,
    setReceiptPaperSize,
    newService,
    setNewService,
    newServicePrice,
    setNewServicePrice,
    newServiceWeight,
    setNewServiceWeight,
    newServiceType,
    setNewServiceType,
    saving,
    hasChanges,
    addService,
    removeService,
    updateServicePrice,
    updateServiceWeight,
    updateServiceType,
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
          <Label htmlFor="receipt-paper-size" className="text-sm font-semibold text-slate-700 mb-2">
            Receipt Paper Size
          </Label>
          <Select value={receiptPaperSize} onValueChange={(val: '58mm' | '80mm') => setReceiptPaperSize(val)}>
            <SelectTrigger id="receipt-paper-size" className="w-48 h-12 mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="58mm">58mm (small)</SelectItem>
              <SelectItem value="80mm">80mm (standard)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400 mt-1">Paper width of your thermal receipt printer</p>
        </div>

        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2">Services Offered</Label>
          <ServicesManager
            services={services}
            servicePrices={servicePrices}
            serviceWeights={serviceWeights}
            serviceTypes={serviceTypes}
            newService={newService}
            newServicePrice={newServicePrice}
            newServiceWeight={newServiceWeight}
            newServiceType={newServiceType}
            onNewServiceChange={setNewService}
            onNewServicePriceChange={setNewServicePrice}
            onNewServiceWeightChange={setNewServiceWeight}
            onNewServiceTypeChange={setNewServiceType}
            onAddService={addService}
            onRemoveService={removeService}
            onUpdateServicePrice={updateServicePrice}
            onUpdateServiceWeight={updateServiceWeight}
            onUpdateServiceType={updateServiceType}
          />
        </div>

        <div>
          <Label htmlFor="rush-fee" className="text-sm font-semibold text-slate-700 mb-2">
            Rush Priority Fee
          </Label>
          <div className="relative w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
              ₱
            </span>
            <Input
              id="rush-fee"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={rushFee}
              onChange={(e) => setRushFee(e.target.value)}
              className="h-12 pl-7 min-h-11"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Extra charge added to rush priority jobs. Set to 0 for no surcharge.</p>
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
