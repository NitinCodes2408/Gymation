"use client";

import { useState } from "react";
import { useApp, Member } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Search, Plus, Download, Filter, Eye, Edit, Trash2, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

export default function MembersPage() {
  const { members, deleteMember, updateMember, addMember, plans, trainers, settings } = useApp();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "joinDate" | "expiryDate">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "", mobile: "", email: "", gender: "male", dob: "", address: "", 
    emergencyContact: "", planId: "", trainerId: "", status: "Active" as Member["status"], notes: ""
  });

  const handleOpenAdd = () => {
    setFormData({
      name: "", mobile: "", email: "", gender: "male", dob: "", address: "", 
      emergencyContact: "", planId: plans[0]?.id || "", trainerId: "", status: "Active", notes: ""
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditMember(member);
    setFormData({
      name: member.name,
      mobile: member.mobile,
      email: member.email,
      gender: member.gender,
      dob: member.dob,
      address: member.address,
      emergencyContact: member.emergencyContact,
      planId: member.planId,
      trainerId: member.trainerId,
      status: member.status,
      notes: member.notes || ""
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === formData.planId);
    const duration = plan ? plan.durationMonths : 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + duration);

    addMember({
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
      gender: formData.gender,
      dob: formData.dob,
      address: formData.address,
      emergencyContact: formData.emergencyContact,
      planId: formData.planId,
      trainerId: formData.trainerId,
      joinDate: new Date().toISOString().split("T")[0],
      expiryDate: expiry.toISOString().split("T")[0],
      status: formData.status,
      photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&q=80",
      notes: formData.notes
    });
    setIsAddOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editMember) {
      updateMember(editMember.id, formData);
      setEditMember(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMember(deleteId);
      setDeleteId(null);
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter & Sort
  const processedMembers = members
    .filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                            m.id.toLowerCase().includes(search.toLowerCase()) || 
                            m.mobile.includes(search);
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesPlan = planFilter === "all" || m.planId === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "joinDate") {
        comparison = a.joinDate.localeCompare(b.joinDate);
      } else if (sortField === "expiryDate") {
        comparison = a.expiryDate.localeCompare(b.expiryDate);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(processedMembers.length / itemsPerPage);
  const paginatedMembers = processedMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // CSV Export Simulation
  const handleExportCSV = () => {
    if (members.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = "ID,Name,Mobile,Email,Gender,Status,Join Date,Expiry Date\n";
    const rows = members.map(m => `"${m.id}","${m.name}","${m.mobile}","${m.email}","${m.gender}","${m.status}","${m.joinDate}","${m.expiryDate}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Gym_Members_${new Date().toISOString().split("T")[0]}.csv`);
    a.click();
    toast.success("CSV file downloaded successfully!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Members</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Register, modify, and monitor gym members.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300" onClick={handleExportCSV}>
            <Download size={16} />
            Export CSV
          </Button>
          <Button onClick={handleOpenAdd} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={16} />
            Add Member
          </Button>
        </div>
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
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all shadow-sm"
              placeholder="Search by name, ID or mobile..."
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Pending">Pending</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plans</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {paginatedMembers.length === 0 ? (
          <EmptyState 
            icon={<Users size={48} className="text-slate-300 dark:text-slate-700" />}
            title="No members found"
            description="Adjust filters or search parameters."
            action={
              <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); setPlanFilter("all"); }}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-800">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>Member {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("joinDate")}>Join Date {sortField === "joinDate" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("expiryDate")}>Expiry Date {sortField === "expiryDate" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMembers.map((member) => {
                  const currentPlan = plans.find(p => p.id === member.planId);
                  return (
                    <TableRow key={member.id} className="dark:border-slate-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img src={member.photo} alt={member.name} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm" />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{member.name}</div>
                            <div className="text-xs text-slate-500">{member.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">{member.mobile}</TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{currentPlan?.name || "No Plan"}</span>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">{member.joinDate}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">{member.expiryDate}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "success" : member.status === "Expired" ? "danger" : "warning"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setViewMember(member)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View member profile"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit member"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => setDeleteId(member.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete member"
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

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
            <div>Showing {paginatedMembers.length} of {processedMembers.length} entries</div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="dark:border-slate-800 dark:text-slate-300"
              >
                Previous
              </Button>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage} of {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="dark:border-slate-800 dark:text-slate-300"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View Member Profile Modal */}
      <Modal isOpen={viewMember !== null} onClose={() => setViewMember(null)} title="Member Profile File">
        {viewMember && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <img src={viewMember.photo} alt={viewMember.name} className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-md" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewMember.name}</h3>
                <p className="text-sm text-slate-500 font-mono">{viewMember.id}</p>
                <Badge variant={viewMember.status === "Active" ? "success" : "danger"} className="mt-1">
                  {viewMember.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mobile Phone</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMember.mobile}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Address</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMember.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Gender / DOB</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 capitalize">{viewMember.gender || "N/A"} ({viewMember.dob || "N/A"})</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Assigned Trainer</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                  {trainers.find(t => t.id === viewMember.trainerId)?.name || "No personal trainer"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Plan Subscription</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                  {plans.find(p => p.id === viewMember.planId)?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Membership Expiry</p>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMember.expiryDate}</p>
              </div>
            </div>

            <div className="text-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Address</p>
              <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMember.address || "No address added"}</p>
            </div>

            <div className="text-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Emergency contact</p>
              <p className="text-slate-800 dark:text-slate-200 mt-0.5">{viewMember.emergencyContact || "None"}</p>
            </div>

            {viewMember.notes && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                <strong>Internal Notes:</strong> {viewMember.notes}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setViewMember(null)}>Close Profile</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register Gym Member">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mobile *</label>
              <input type="text" required value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="+1 555-000-0000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="jane@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
              <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
              <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan Subscription *</label>
              <select value={formData.planId} onChange={(e) => setFormData({ ...formData, planId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {settings.currency}{p.price}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Personal Trainer</label>
              <select value={formData.trainerId} onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="">None</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Address</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="123 Gym St" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Emergency Contact</label>
            <input type="text" value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="Relation - Name - Phone" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Medical/Fitness Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm h-16 outline-none resize-none" placeholder="Notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Member</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal isOpen={editMember !== null} onClose={() => setEditMember(null)} title="Edit Member Profile">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mobile *</label>
              <input type="text" required value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
              <select value={formData.planId} onChange={(e) => setFormData({ ...formData, planId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trainer</label>
              <select value={formData.trainerId} onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="">None</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Member["status"] })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Address</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Emergency Contact</label>
            <input type="text" value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm h-16 outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Member Confirmation Modal */}
      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Remove Gym Member">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to permanently delete this member? All payment logs and attendance will be archived and removed.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>Delete Member</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
