"use client";

import { useState } from "react";
import { useApp, Trainer } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Search, Plus, Filter, Edit, Trash2, Shield, Upload, X } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";

export default function TrainersPage() {
  const { trainers, addTrainer, updateTrainer, deleteTrainer, members } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specFilter, setSpecFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    mobile: "",
    email: "",
    status: "Active" as "Active" | "Inactive",
    photo: "",
  });

  const getTrainerMemberCount = (trainerId: string) => {
    return members.filter(m => m.trainerId === trainerId).length;
  };

  const specializations = Array.from(new Set(trainers.map(t => t.specialization)));

  const filteredTrainers = trainers.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.specialization.toLowerCase().includes(search.toLowerCase()) ||
                          t.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSpec = specFilter === "all" || t.specialization === specFilter;
    return matchesSearch && matchesStatus && matchesSpec;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      specialization: "",
      mobile: "",
      email: "",
      status: "Active",
      photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&q=80",
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setFormData({
      name: trainer.name,
      specialization: trainer.specialization,
      mobile: trainer.mobile,
      email: trainer.email,
      status: trainer.status,
      photo: trainer.photo,
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTrainer(formData);
    setIsAddOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTrainer) {
      updateTrainer(selectedTrainer.id, formData);
      setIsEditOpen(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedTrainer) {
      deleteTrainer(selectedTrainer.id);
      setIsDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Trainers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your certified coaches and trainer client assignments.</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus size={16} />
          Add Trainer
        </Button>
      </div>

      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
              placeholder="Search trainer by name, ID or specialty..."
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Specialties</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredTrainers.length === 0 ? (
          <EmptyState
            icon={<Shield size={48} className="text-slate-300 dark:text-slate-700" />}
            title="No trainers found"
            description="We couldn't find any coaches matching your search. Try resetting filters."
            action={
              <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); setSpecFilter("all"); }}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-800">
                <TableHead>Coach</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Clients Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrainers.map((trainer) => (
                <TableRow key={trainer.id} className="dark:border-slate-800">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={trainer.photo} alt={trainer.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{trainer.name}</div>
                        <div className="text-xs text-slate-500">{trainer.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                    {trainer.specialization}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      <div>{trainer.mobile}</div>
                      <div>{trainer.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTrainerMemberCount(trainer.id) > 0 ? "info" : "default"}>
                      {getTrainerMemberCount(trainer.id)} Clients
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={trainer.status === "Active" ? "success" : "danger"}>
                      {trainer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEdit(trainer)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenDelete(trainer)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Trainer Profile">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
              placeholder="e.g. Marcus Aurelius" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specialization *</label>
            <input 
              type="text" 
              required 
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
              placeholder="e.g. Strength & Conditioning" 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mobile *</label>
              <input 
                type="text" 
                required 
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
                placeholder="+1 555-000-0000" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email *</label>
              <input 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
                placeholder="coach@gymation.com" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trainer Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "Active" | "Inactive" })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Trainer</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Trainer Info">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specialization *</label>
            <input 
              type="text" 
              required 
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mobile *</label>
              <input 
                type="text" 
                required 
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email *</label>
              <input 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trainer Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "Active" | "Inactive" })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Trainer">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to remove <strong>{selectedTrainer?.name}</strong>? All members currently assigned to this coach will be unassigned.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>Delete Coach</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
