"use client";

import { useState } from "react";
import { useApp, Trainer, Member } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import { Search, Plus, Filter, Edit, Trash2, Shield, Eye, Star, Clock, Users, Phone, Mail, Calendar, CheckCircle2, UserCheck, ChevronRight, Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

export default function TrainersPage() {
  const { trainers, addTrainer, updateTrainer, deleteTrainer, members, plans, attendance, settings } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [specFilter, setSpecFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [viewTrainer, setViewTrainer] = useState<Trainer | null>(null);

  // Dedicated state for viewing assigned clients of a trainer
  const [assignedClientsTrainer, setAssignedClientsTrainer] = useState<Trainer | null>(null);
  const [viewMemberDetail, setViewMemberDetail] = useState<Member | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    specialization: string;
    mobile: string;
    email: string;
    status: "Active" | "Inactive";
    photo: string;
    trainerType: "General Trainer" | "Personal Trainer";
    ptChargeType: "Monthly" | "Per Session";
    ptCharges: string;
    availability: string;
  }>({
    name: "",
    specialization: "",
    mobile: "",
    email: "",
    status: "Active",
    photo: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=256&h=256&q=80",
    trainerType: "Personal Trainer",
    ptChargeType: "Monthly",
    ptCharges: "2000",
    availability: "Mon-Sat: 06:00 AM - 02:00 PM",
  });

  const getTrainerMembers = (trainerId: string) => {
    return members.filter((m) => m.trainerId === trainerId);
  };

  const getTrainerMemberCount = (trainerId: string) => {
    return getTrainerMembers(trainerId).length;
  };

  const specializations = Array.from(new Set(trainers.map((t) => t.specialization)));

  const filteredTrainers = trainers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialization.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesType = typeFilter === "all" || t.trainerType === typeFilter;
    const matchesSpec = specFilter === "all" || t.specialization === specFilter;
    return matchesSearch && matchesStatus && matchesType && matchesSpec;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      specialization: "",
      mobile: "",
      email: "",
      status: "Active",
      photo: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=256&h=256&q=80",
      trainerType: "Personal Trainer",
      ptChargeType: "Monthly",
      ptCharges: "2000",
      availability: "Mon-Sat: 08:00 AM - 04:00 PM",
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
      trainerType: trainer.trainerType || "Personal Trainer",
      ptChargeType: trainer.ptChargeType || "Monthly",
      ptCharges: String(trainer.ptCharges !== undefined ? trainer.ptCharges : 0),
      availability: trainer.availability || "Mon-Sat: 08:00 AM - 04:00 PM",
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numCharges = formData.trainerType === "General Trainer" ? 0 : parseFloat(formData.ptCharges);
    if (formData.trainerType === "Personal Trainer" && (isNaN(numCharges) || numCharges < 0)) {
      toast.error("PT charges cannot be negative");
      return;
    }

    addTrainer({
      name: formData.name.trim(),
      specialization: formData.specialization.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email.trim(),
      status: formData.status,
      photo: formData.photo || "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=256&h=256&q=80",
      trainerType: formData.trainerType,
      ptChargeType: formData.ptChargeType,
      ptCharges: numCharges >= 0 ? numCharges : 0,
      availability: formData.availability,
    });
    setIsAddOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;

    const numCharges = formData.trainerType === "General Trainer" ? 0 : parseFloat(formData.ptCharges);
    if (formData.trainerType === "Personal Trainer" && (isNaN(numCharges) || numCharges < 0)) {
      toast.error("PT charges cannot be negative");
      return;
    }

    updateTrainer(selectedTrainer.id, {
      name: formData.name.trim(),
      specialization: formData.specialization.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email.trim(),
      status: formData.status,
      photo: formData.photo,
      trainerType: formData.trainerType,
      ptChargeType: formData.ptChargeType,
      ptCharges: numCharges >= 0 ? numCharges : 0,
      availability: formData.availability,
    });
    setIsEditOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedTrainer) {
      deleteTrainer(selectedTrainer.id);
      setIsDeleteOpen(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Trainers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your certified coaches, Personal Training (PT) charges in INR (₹), and client assignments.
          </p>
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="Personal Trainer">Personal Trainer</option>
              <option value="General Trainer">General Trainer</option>
            </select>

            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Specialties</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
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
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setSpecFilter("all");
                }}
              >
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-800">
                  <TableHead>Coach</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>PT Charges</TableHead>
                  <TableHead>Clients Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainers.map((trainer) => {
                  const count = getTrainerMemberCount(trainer.id);
                  const isPT = trainer.trainerType === "Personal Trainer";

                  return (
                    <TableRow key={trainer.id} className="dark:border-slate-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={trainer.photo}
                            alt={trainer.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{trainer.name}</div>
                            <div className="text-xs text-slate-500">{trainer.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPT ? "info" : "default"}>
                          {trainer.trainerType || "Personal Trainer"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                        {trainer.specialization}
                      </TableCell>
                      <TableCell>
                        {isPT ? (
                          <div className="font-bold text-purple-700 dark:text-purple-400">
                            {formatCurrency(trainer.ptCharges || 0)}
                            <span className="text-[11px] font-normal text-slate-500">/{trainer.ptChargeType || "Month"}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Included (₹0)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            setClientSearch("");
                            setAssignedClientsTrainer(trainer);
                          }}
                          className="group flex items-center gap-1.5 focus:outline-none"
                          title="Click to view assigned clients"
                        >
                          <Badge
                            variant={count > 0 ? "info" : "default"}
                            className="cursor-pointer group-hover:ring-2 group-hover:ring-blue-400 transition-all flex items-center gap-1"
                          >
                            <Users size={12} />
                            <span>{count} Clients</span>
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trainer.status === "Active" ? "success" : "danger"}>
                          {trainer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setClientSearch("");
                              setAssignedClientsTrainer(trainer);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View Assigned Clients"
                          >
                            <Users size={18} />
                          </button>
                          <button
                            onClick={() => setViewTrainer(trainer)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View Trainer Profile"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(trainer)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Trainer"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(trainer)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete Trainer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* View Assigned Clients Modal */}
      <Modal
        isOpen={assignedClientsTrainer !== null}
        onClose={() => setAssignedClientsTrainer(null)}
        title={`Assigned Clients - ${assignedClientsTrainer?.name || ""}`}
      >
        {assignedClientsTrainer && (() => {
          const assignedMembers = getTrainerMembers(assignedClientsTrainer.id);
          const filteredAssignedMembers = assignedMembers.filter(
            (m) =>
              m.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
              m.mobile.includes(clientSearch) ||
              m.id.toLowerCase().includes(clientSearch.toLowerCase())
          );

          return (
            <div className="space-y-5">
              <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 p-4 rounded-2xl border border-blue-100 dark:border-slate-700">
                <img
                  src={assignedClientsTrainer.photo}
                  alt={assignedClientsTrainer.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shadow"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{assignedClientsTrainer.name}</h3>
                    <Badge variant={assignedClientsTrainer.status === "Active" ? "success" : "danger"}>
                      {assignedClientsTrainer.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {assignedClientsTrainer.trainerType} • {assignedClientsTrainer.specialization}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    PT Charges: <strong className="text-purple-600 dark:text-purple-400">{formatCurrency(assignedClientsTrainer.ptCharges)}/{assignedClientsTrainer.ptChargeType || "Month"}</strong> | Clients: <strong className="text-slate-800 dark:text-slate-200">{assignedMembers.length}</strong>
                  </p>
                </div>
              </div>

              {assignedMembers.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs shadow-sm"
                    placeholder="Filter assigned clients by name, ID or phone..."
                  />
                </div>
              )}

              {assignedMembers.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Users size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Clients Assigned Yet</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Assign members to {assignedClientsTrainer.name} from the Members directory.
                  </p>
                </div>
              ) : filteredAssignedMembers.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                  No client matching "{clientSearch}"
                </p>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {filteredAssignedMembers.map((member) => {
                    const currentPlan = plans.find((p) => p.id === member.planId);
                    const todayAttendance = attendance.find((a) => a.memberId === member.id && a.date === todayStr);

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{member.name}</h4>
                              <Badge variant={member.status === "Active" ? "success" : member.status === "Expired" ? "danger" : "warning"} className="text-[10px] px-1.5 py-0">
                                {member.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-400">{member.id}</span>
                              <span className="flex items-center gap-1"><Phone size={11} /> {member.mobile}</span>
                              {currentPlan && (
                                <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                  {currentPlan.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                          {todayAttendance ? (
                            <Badge variant={todayAttendance.status === "Present" ? "success" : "danger"} className="text-[11px]">
                              {todayAttendance.status === "Present" ? "Present Today" : "Absent"}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">Not checked in</span>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewMemberDetail(member)}
                            className="gap-1 text-xs border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 text-slate-700 dark:text-slate-200"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button onClick={() => setAssignedClientsTrainer(null)}>Close</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Member Profile Detail Modal */}
      <Modal isOpen={viewMemberDetail !== null} onClose={() => setViewMemberDetail(null)} title="Client Dossier">
        {viewMemberDetail && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <img src={viewMemberDetail.photo} alt={viewMemberDetail.name} className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-md" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewMemberDetail.name}</h3>
                <p className="text-sm text-slate-500 font-mono">{viewMemberDetail.id}</p>
                <Badge variant={viewMemberDetail.status === "Active" ? "success" : viewMemberDetail.status === "Expired" ? "danger" : "warning"} className="mt-1">
                  {viewMemberDetail.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mobile Phone</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMemberDetail.mobile}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Address</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMemberDetail.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Plan Subscription</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-medium">
                  {plans.find((p) => p.id === viewMemberDetail.planId)?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Membership Expiry</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMemberDetail.expiryDate}</p>
              </div>
            </div>

            {viewMemberDetail.notes && (
              <div className="bg-blue-50/60 dark:bg-slate-800/60 p-3 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                <strong>Training Notes:</strong> {viewMemberDetail.notes}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t dark:border-slate-800">
              <Button onClick={() => setViewMemberDetail(null)}>Back to Trainer Clients</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Trainer Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Certified Trainer">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
              placeholder="e.g. Amit Patil"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trainer Role *</label>
              <select
                value={formData.trainerType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    trainerType: e.target.value as Trainer["trainerType"],
                    ptCharges: e.target.value === "General Trainer" ? "0" : formData.ptCharges || "2000",
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                <option value="Personal Trainer">Personal Trainer (PT)</option>
                <option value="General Trainer">General Trainer (Floor)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specialization *</label>
              <input
                type="text"
                required
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
                placeholder="e.g. Strength & HIIT"
              />
            </div>
          </div>

          {formData.trainerType === "Personal Trainer" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-purple-900 dark:text-purple-300">PT Charge Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.ptCharges}
                  onChange={(e) => setFormData({ ...formData, ptCharges: e.target.value })}
                  className="w-full px-3 py-2 border border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
                  placeholder="2000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-purple-900 dark:text-purple-300">Charge Basis</label>
                <select
                  value={formData.ptChargeType}
                  onChange={(e) => setFormData({ ...formData, ptChargeType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
                >
                  <option value="Monthly">Monthly Recurring</option>
                  <option value="Per Session">Per Session</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mobile *</label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
                placeholder="+91 98765 00000"
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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Working Availability</label>
            <input
              type="text"
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              placeholder="e.g. Mon-Sat: 06:00 AM - 02:00 PM"
            />
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
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Trainer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Trainer Modal */}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trainer Role *</label>
              <select
                value={formData.trainerType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    trainerType: e.target.value as Trainer["trainerType"],
                    ptCharges: e.target.value === "General Trainer" ? "0" : formData.ptCharges || "2000",
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                <option value="Personal Trainer">Personal Trainer (PT)</option>
                <option value="General Trainer">General Trainer (Floor)</option>
              </select>
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
          </div>

          {formData.trainerType === "Personal Trainer" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-purple-900 dark:text-purple-300">PT Charge Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.ptCharges}
                  onChange={(e) => setFormData({ ...formData, ptCharges: e.target.value })}
                  className="w-full px-3 py-2 border border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-purple-900 dark:text-purple-300">Charge Basis</label>
                <select
                  value={formData.ptChargeType}
                  onChange={(e) => setFormData({ ...formData, ptChargeType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
                >
                  <option value="Monthly">Monthly Recurring</option>
                  <option value="Per Session">Per Session</option>
                </select>
              </div>
            </div>
          )}

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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Working Availability</label>
            <input
              type="text"
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            />
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
            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
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
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Coach
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Trainer Profile Modal */}
      <Modal isOpen={viewTrainer !== null} onClose={() => setViewTrainer(null)} title="Trainer Dossier">
        {viewTrainer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <img
                src={viewTrainer.photo}
                alt={viewTrainer.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-md"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewTrainer.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{viewTrainer.id}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={viewTrainer.status === "Active" ? "success" : "danger"}>
                    {viewTrainer.status}
                  </Badge>
                  <Badge variant={viewTrainer.trainerType === "Personal Trainer" ? "info" : "default"}>
                    {viewTrainer.trainerType || "Personal Trainer"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wide">Specialty Focus</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-medium">{viewTrainer.specialization}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wide">PT Charge Rates</p>
                <p className="text-purple-700 dark:text-purple-400 mt-0.5 font-bold">
                  {viewTrainer.trainerType === "Personal Trainer"
                    ? `${formatCurrency(viewTrainer.ptCharges || 0)}/${viewTrainer.ptChargeType || "Month"}`
                    : "Included in Membership (₹0)"}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wide">Contact Phone</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-medium">{viewTrainer.mobile}</p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wide">Email Address</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-medium">{viewTrainer.email}</p>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Clock size={14} /> Weekly Availability slots
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                {viewTrainer.availability || "Monday - Friday: 08:00 AM - 05:00 PM | Saturday: 09:00 AM - 02:00 PM"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Assigned Roster List</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewTrainer(null);
                    setAssignedClientsTrainer(viewTrainer);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline p-0 h-auto"
                >
                  View All Details
                </Button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {getTrainerMembers(viewTrainer.id).map((m) => (
                  <div key={m.id} className="py-2 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <img src={m.photo} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-semibold">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.status === "Active" ? "success" : "danger"}>{m.status}</Badge>
                      <button
                        onClick={() => {
                          setViewTrainer(null);
                          setViewMemberDetail(m);
                        }}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="View profile"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {getTrainerMembers(viewTrainer.id).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No active clients assigned.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t dark:border-slate-800">
              <Button onClick={() => setViewTrainer(null)}>Close Dossier</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
