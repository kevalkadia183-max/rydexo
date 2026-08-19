import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getVehicles, saveVehicle, deleteVehicleById } from '@/services/storage';
import { uploadVehicle, deleteCloudVehicle } from '@/services/cloudSync';
import type { Vehicle } from '@/models/types';

interface VehicleContextType {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  isLoading: boolean;
  addVehicle: (v: Omit<Vehicle, 'id' | 'createdAt' | 'isDefault'>) => Promise<Vehicle>;
  updateVehicle: (v: Vehicle) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  setDefaultVehicle: (id: string) => Promise<void>;
  refreshVehicles: () => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType>({
  vehicles: [],
  activeVehicle: null,
  isLoading: true,
  addVehicle: async () => ({} as Vehicle),
  updateVehicle: async () => {},
  removeVehicle: async () => {},
  setDefaultVehicle: async () => {},
  refreshVehicles: async () => {},
});

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const vs = await getVehicles();
    setVehicles(vs);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeVehicle = vehicles.find(v => v.isDefault) ?? vehicles[0] ?? null;

  const addVehicle = useCallback(async (data: Omit<Vehicle, 'id' | 'createdAt' | 'isDefault'>) => {
    const existing = await getVehicles();
    const isFirst = existing.length === 0;
    const vehicle: Vehicle = {
      ...data,
      id: `${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      isDefault: isFirst,
    };
    await saveVehicle(vehicle);
    await load();
    uploadVehicle(vehicle).catch(() => {});
    return vehicle;
  }, [load]);

  const updateVehicle = useCallback(async (vehicle: Vehicle) => {
    await saveVehicle(vehicle);
    await load();
    uploadVehicle(vehicle).catch(() => {});
  }, [load]);

  const removeVehicle = useCallback(async (id: string) => {
    await deleteVehicleById(id);
    await load();
    deleteCloudVehicle(id).catch(() => {});
  }, [load]);

  const setDefaultVehicle = useCallback(async (id: string) => {
    const vs = await getVehicles();
    const updated = vs.map(v => ({ ...v, isDefault: v.id === id }));
    for (const v of updated) await saveVehicle(v);
    await load();
  }, [load]);

  return (
    <VehicleContext.Provider value={{ vehicles, activeVehicle, isLoading, addVehicle, updateVehicle, removeVehicle, setDefaultVehicle, refreshVehicles: load }}>
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicles() {
  return useContext(VehicleContext);
}
