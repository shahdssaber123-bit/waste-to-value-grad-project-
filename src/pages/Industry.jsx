import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/shared/Navbar";
import StatCard from "@/components/shared/StatCard";
import PaginatedList from "@/components/shared/PaginatedList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ShoppingCart,
    Package,
    Clock,
    FileText,
    Building2,
    Calendar,
    Scale,
    Shield,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Eye,
    Factory,
    Users,
    Lock,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { platformV1 } from "@/services/platformV1Service";
import { useToast } from "@/components/ui/use-toast";
import { getFriendlyError } from "@/lib/friendlyErrors";

function statusClass(status = "") {
    const s = String(status).toLowerCase();
    if (
        [
            "matched",
            "matched_reserved",
            "scheduled",
            "confirmed",
            "fulfilled",
            "paid",
            "delivered",
        ].includes(s)
    )
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (["requested", "pending", "draft", "shipped"].includes(s))
        return "bg-amber-50 text-amber-700 border-amber-200";
    if (["rejected", "cancelled", "overdue", "disputed"].includes(s))
        return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function Industry() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [materials, setMaterials] = useState([]);
    const [requests, setRequests] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [showReserve, setShowReserve] = useState(null);
    const [materialProfile, setMaterialProfile] = useState(null);
    const [form, setForm] = useState({
        quantity: "",
        meetingDate: "",
        notes: "",
        companyDetails: "",
    });
    const [filters, setFilters] = useState({
        search: "",
        material: "all",
        hub: "all",
        grade: "all",
        status: "all",
        schedule: "all",
        minPrice: "",
        maxPrice: "",
        minQty: "",
    });

    const canAccess =
        currentUser && ["industry", "factory"].includes(currentUser.role);

    async function loadFactoryData() {
        if (!canAccess) return;
        setLoading(true);
        try {
            const [marketplace, materialRequests, factoryDeliveries] =
                await Promise.allSettled([
                    platformV1.marketplace.materials(),
                    platformV1.factory.materialRequests(),
                    platformV1.factory.deliveries(),
                ]);
            if (marketplace.status === "fulfilled")
                setMaterials(
                    Array.isArray(marketplace.value) ? marketplace.value : [],
                );
            if (materialRequests.status === "fulfilled") {
                const value = materialRequests.value;
                setRequests(Array.isArray(value) ? value : value?.data || []);
            }
            if (factoryDeliveries.status === "fulfilled")
                setDeliveries(
                    Array.isArray(factoryDeliveries.value)
                        ? factoryDeliveries.value
                        : [],
                );
        } catch (error) {
            const friendly = getFriendlyError(error);
            toast({
                title: friendly.title,
                description: friendly.description,
                variant: "destructive",
                duration: 4000,
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFactoryData();
    }, [currentUser?.platformId]);

    const myInvoices = useMemo(() => {
        return requests
            .filter((r) =>
                [
                    "requested",
                    "matched",
                    "matched_reserved",
                    "scheduled",
                    "shipped",
                    "delivered",
                    "confirmed",
                    "fulfilled",
                    "paid",
                    "pending",
                ].includes(String(r.status).toLowerCase()),
            )
            .map((r) => ({
                ...r,
                invoice_status:
                    r.invoice_status ||
                    (["paid"].includes(String(r.status).toLowerCase())
                        ? "paid"
                        : ["confirmed", "fulfilled", "delivered"].includes(
                                String(r.status).toLowerCase(),
                            )
                          ? "ready"
                          : "pending"),
            }));
    }, [requests]);

    const materialOptions = useMemo(
        () =>
            [
                ...new Set(materials.map((m) => m.material).filter(Boolean)),
            ].sort(),
        [materials],
    );
    const hubOptions = useMemo(
        () => [...new Set(materials.map((m) => m.hub).filter(Boolean))].sort(),
        [materials],
    );
    const gradeOptions = useMemo(
        () =>
            [
                ...new Set(
                    materials
                        .map((m) => m.grade || m.purityGrade)
                        .filter(Boolean),
                ),
            ].sort(),
        [materials],
    );

    function requestForMaterial(item) {
        return requests.find(
            (r) => Number(r.commodity_id) === Number(item.commodity_id),
        );
    }

    function scheduleState(item) {
        const request = requestForMaterial(item);
        const status = String(request?.status || "").toLowerCase();
        if (
            [
                "scheduled",
                "shipped",
                "delivered",
                "fulfilled",
                "confirmed",
            ].includes(status)
        )
            return "scheduled";
        if (["matched", "matched_reserved"].includes(status)) return "matched";
        if (status) return "requested";
        return "not_scheduled";
    }

    const filteredMaterials = useMemo(() => {
        const search = filters.search.trim().toLowerCase();
        return materials.filter((item) => {
            const price = Number(item.price_per_kg || 0);
            const available = Number(item.available_kg || item.weight || 0);
            const state = scheduleState(item);
            const haystack = [
                item.material,
                item.hub,
                item.batchId,
                item.purityGrade,
                item.grade,
                item.condition,
                item.source_summary,
                String(item.supplier_count || ""),
            ]
                .join(" ")
                .toLowerCase();

            if (search && !haystack.includes(search)) return false;
            if (
                filters.material !== "all" &&
                item.material !== filters.material
            )
                return false;
            if (filters.hub !== "all" && item.hub !== filters.hub) return false;
            if (
                filters.grade !== "all" &&
                !String(item.purityGrade || item.grade || "").includes(
                    filters.grade,
                )
            )
                return false;
            if (filters.status === "available" && available <= 0) return false;
            if (
                filters.status === "reserved" &&
                Number(item.reserved_kg || 0) <= 0
            )
                return false;
            if (filters.schedule !== "all" && state !== filters.schedule)
                return false;
            if (filters.minPrice !== "" && price < Number(filters.minPrice))
                return false;
            if (filters.maxPrice !== "" && price > Number(filters.maxPrice))
                return false;
            if (filters.minQty !== "" && available < Number(filters.minQty))
                return false;
            return true;
        });
    }, [materials, requests, filters]);

    const resetFilters = () =>
        setFilters({
            search: "",
            material: "all",
            hub: "all",
            grade: "all",
            status: "all",
            schedule: "all",
            minPrice: "",
            maxPrice: "",
            minQty: "",
        });

    if (!canAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="font-heading text-2xl font-bold mb-2">
                        Access Denied
                    </h2>
                    <p className="text-muted-foreground mb-4">
                        Please log in as Factory to access this page.
                    </p>
                    <Button
                        onClick={() => navigate("/login")}
                        className="bg-gradient-wine text-white"
                    >
                        Sign In
                    </Button>
                </div>
            </div>
        );
    }

    const handleReserve = async () => {
        if (!showReserve || !form.quantity || !form.meetingDate) {
            toast({
                title: "Check your information",
                description:
                    "Please enter the desired quantity and discussion date.",
                variant: "destructive",
                duration: 4000,
            });
            return;
        }
        if (
            Number(form.quantity) >
            Number(showReserve.available_kg || showReserve.weight || 0)
        ) {
            toast({
                title: "Quantity is too high",
                description:
                    "Please request a quantity within the available stock.",
                variant: "destructive",
                duration: 4000,
            });
            return;
        }
        setLoading(true);
        try {
            await platformV1.factory.createMaterialRequest({
                commodity_id: showReserve.commodity_id,
                preferred_grade: showReserve.grade || "A",
                quantity_kg: Number(form.quantity),
                preferred_delivery_date: form.meetingDate,
                company_details:
                    form.companyDetails ||
                    `${currentUser.company || currentUser.name} - ${currentUser.sector || "Manufacturing"}`,
                notes: form.notes,
            });
            toast({
                title: "Request submitted",
                description:
                    "Your request was sent to the platform and appears in Admin material requests.",
                duration: 4000,
            });
            setShowReserve(null);
            setForm({
                quantity: "",
                meetingDate: "",
                notes: "",
                companyDetails: "",
            });
            await loadFactoryData();
        } catch (error) {
            const friendly = getFriendlyError(error);
            toast({
                title: friendly.title,
                description: friendly.description,
                variant: "destructive",
                duration: 4000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-heading text-2xl font-bold">
                            Factory Portal
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {currentUser.name} ·{" "}
                            {currentUser.company || "Factory account"}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={loadFactoryData}
                        disabled={loading}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh Live Data
                    </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        title="Available Materials"
                        value={materials.length}
                        icon={Package}
                    />
                    <StatCard
                        title="Material Requests"
                        value={requests.length}
                        icon={ShoppingCart}
                    />
                    <StatCard
                        title="Outbound Deliveries"
                        value={deliveries.length}
                        icon={Shield}
                    />
                    <StatCard
                        title="Matched"
                        value={
                            requests.filter((r) =>
                                [
                                    "matched",
                                    "matched_reserved",
                                    "scheduled",
                                    "fulfilled",
                                ].includes(String(r.status).toLowerCase()),
                            ).length
                        }
                        icon={Clock}
                    />
                </div>

                <Tabs defaultValue="browse" className="space-y-6">
                    <TabsList className="bg-muted rounded-xl p-1 flex flex-wrap h-auto">
                        <TabsTrigger
                            value="browse"
                            className="rounded-lg text-xs"
                        >
                            Available Materials
                        </TabsTrigger>
                        <TabsTrigger
                            value="reservations"
                            className="rounded-lg text-xs"
                        >
                            Material Requests
                        </TabsTrigger>
                        <TabsTrigger
                            value="outbound"
                            className="rounded-lg text-xs"
                        >
                            Outbound Delivery
                        </TabsTrigger>
                        <TabsTrigger
                            value="invoices"
                            className="rounded-lg text-xs"
                        >
                            Invoices
                        </TabsTrigger>
                        <TabsTrigger
                            value="profile"
                            className="rounded-lg text-xs"
                        >
                            Company Profile
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse" className="space-y-4">
                        <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/25 dark:via-card dark:to-teal-950/20">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                                            <SlidersHorizontal className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold">
                                                Advanced marketplace filters
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Filter by material, price,
                                                supplier coverage, warehouse,
                                                grade, product state, and
                                                schedule state.
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="w-fit bg-emerald-100 text-emerald-800 border-emerald-200">
                                        Showing {filteredMaterials.length} of{" "}
                                        {materials.length}
                                    </Badge>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="relative xl:col-span-2">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="Search material, supplier count, hub, batch, grade..."
                                            value={filters.search}
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    search: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <select
                                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                                        value={filters.material}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                material: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="all">
                                            All materials
                                        </option>
                                        {materialOptions.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                                        value={filters.hub}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                hub: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="all">
                                            All warehouses / hubs
                                        </option>
                                        {hubOptions.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                                        value={filters.grade}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                grade: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="all">All grades</option>
                                        {gradeOptions.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                                        value={filters.status}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                status: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="all">
                                            All product states
                                        </option>
                                        <option value="available">
                                            Available stock
                                        </option>
                                        <option value="reserved">
                                            Has reserved stock
                                        </option>
                                    </select>
                                    <select
                                        className="h-10 rounded-xl border bg-background px-3 text-sm"
                                        value={filters.schedule}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                schedule: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="all">
                                            All schedule states
                                        </option>
                                        <option value="not_scheduled">
                                            Not requested / unscheduled
                                        </option>
                                        <option value="requested">
                                            Requested
                                        </option>
                                        <option value="matched">Matched</option>
                                        <option value="scheduled">
                                            Scheduled / shipped
                                        </option>
                                    </select>
                                    <Input
                                        type="number"
                                        placeholder="Min price / kg"
                                        value={filters.minPrice}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                minPrice: e.target.value,
                                            })
                                        }
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Max price / kg"
                                        value={filters.maxPrice}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                maxPrice: e.target.value,
                                            })
                                        }
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Min available kg"
                                        value={filters.minQty}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                minQty: e.target.value,
                                            })
                                        }
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={resetFilters}
                                    >
                                        <X className="w-4 h-4 mr-2" /> Reset
                                        filters
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <PaginatedList
                            items={filteredMaterials}
                            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                            empty={
                                <Card className="col-span-full p-12 text-center">
                                    <p className="text-muted-foreground">
                                        No materials match these filters. Try
                                        resetting the search or price/quantity
                                        filters.
                                    </p>
                                </Card>
                            }
                        >
                            {(item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    <Card className="overflow-hidden hover:shadow-xl transition-all group">
                                        <div className="relative h-32 overflow-hidden">
                                            <img
                                                src={item.image_url}
                                                alt={item.material}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] font-mono bg-white/90"
                                                >
                                                    {item.batchId}
                                                </Badge>
                                                <Badge className="text-[10px] bg-emerald-50 text-emerald-700">
                                                    Live stock
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardContent className="p-5">
                                            <h3 className="font-bold text-base mb-1">
                                                {item.material}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Warehouse:{" "}
                                                <span className="font-semibold text-foreground">
                                                    {item.hub}
                                                </span>
                                            </p>
                                            <div className="grid grid-cols-2 gap-y-2 text-xs text-muted-foreground mb-4">
                                                <div className="flex items-center gap-1">
                                                    <Scale className="w-3 h-3" />{" "}
                                                    {Number(
                                                        item.available_kg,
                                                    ).toLocaleString()}
                                                    kg available
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Lock className="w-3 h-3" />{" "}
                                                    {Number(
                                                        item.reserved_kg || 0,
                                                    ).toLocaleString()}
                                                    kg reserved
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />{" "}
                                                    {item.purityGrade}
                                                </div>
                                                <div>
                                                    Price:{" "}
                                                    <span className="text-foreground">
                                                        $
                                                        {Number(
                                                            item.price_per_kg,
                                                        ).toFixed(2)}
                                                        /kg
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />{" "}
                                                    {item.supplier_count || 0}{" "}
                                                    supplier contracts
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Factory className="w-3 h-3" />{" "}
                                                    {item.factory_count || 0}{" "}
                                                    factory links
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{" "}
                                                    {scheduleState(
                                                        item,
                                                    ).replaceAll("_", " ")}
                                                </div>
                                                <div>
                                                    Status:{" "}
                                                    <span className="text-foreground">
                                                        {Number(
                                                            item.available_kg ||
                                                                0,
                                                        ) > 0
                                                            ? "Available"
                                                            : "Reserved"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setMaterialProfile(item)
                                                    }
                                                    className="rounded-xl text-xs"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1.5" />{" "}
                                                    Profile
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        setShowReserve(item)
                                                    }
                                                    className="bg-gradient-wine text-white rounded-xl text-xs hover:opacity-90"
                                                >
                                                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />{" "}
                                                    Request
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </PaginatedList>
                    </TabsContent>

                    <TabsContent value="reservations">
                        <PaginatedList
                            items={requests}
                            className="space-y-4"
                            empty={
                                <Card className="p-12 text-center">
                                    <p className="text-muted-foreground">
                                        No material requests yet.
                                    </p>
                                </Card>
                            }
                        >
                            {(res) => (
                                <Card key={res.id} className="overflow-hidden">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-sm">
                                                    {res.material ||
                                                        `Commodity #${res.commodity_id}`}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Request #{res.id} ·{" "}
                                                    {Number(
                                                        res.quantity_kg,
                                                    ).toLocaleString()}
                                                    kg · Preferred date:{" "}
                                                    {res.preferred_delivery_date ||
                                                        "not selected"}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Matched Hub:{" "}
                                                    {res.matched_hub ||
                                                        "Waiting for stock match"}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={statusClass(
                                                    res.status,
                                                )}
                                            >
                                                {res.status}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </PaginatedList>
                    </TabsContent>

                  <TabsContent value="outbound">
    <PaginatedList
        items={deliveries}
        className="space-y-4"
        empty={
            <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                    No outbound deliveries yet.
                </p>
            </Card>
        }
    >
        {(delivery) => (
            <Card key={delivery.id} className="overflow-hidden">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-sm">
                                Delivery #{delivery.id} ·{" "}
                                {delivery.commodity?.title ||
                                    delivery.material ||
                                    "Material"}
                            </h3>

                            <p className="text-xs text-muted-foreground">
                                Quantity:{" "}
                                {delivery.quantity_kg ||
                                    delivery.allocatedQty}
                                kg · Scheduled:{" "}
                                {delivery.scheduled_date || delivery.eta}
                            </p>
                        </div>

                        <Badge
                            variant="outline"
                            className={statusClass(delivery.status)}
                        >
                            {delivery.status}
                        </Badge>
                    </div>

                    <div className="mt-3 flex gap-2">
                        <Button
                            size="sm"
                            className="h-7 text-xs bg-gradient-primary text-white"
                            onClick={async () => {
                                await platformV1.factory.confirmDelivery(
                                    delivery.id,
                                );
                                await loadFactoryData();
                            }}
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirm Receipt
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={async () => {
                                await platformV1.factory.rejectDelivery(
                                    delivery.id,
                                    "Rejected during the 48-hour factory review window.",
                                );
                                await loadFactoryData();
                            }}
                        >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Reject During 48h Window
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}
    </PaginatedList>
</TabsContent>

<TabsContent value="invoices">
    <PaginatedList
        items={myInvoices}
        className="space-y-4"
        empty={
            <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                    No invoice-ready requests yet.
                </p>
            </Card>
        }
    >
        {(res) => (
            <Card key={res.id} className="overflow-hidden">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>

                            <div>
                                <p className="font-semibold text-sm">
                                    Invoice #{res.id}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                    {res.material ||
                                        `Commodity #${res.commodity_id}`}{" "}
                                    ·{" "}
                                    {Number(
                                        res.quantity_kg || 0,
                                    ).toLocaleString()}
                                    kg
                                </p>

                                <p className="text-xs text-muted-foreground mt-1">
                                    Workflow Status: {res.status}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <Badge
                                className={
                                    res.invoice_status === "paid"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : res.invoice_status === "ready"
                                          ? "bg-blue-50 text-blue-700"
                                          : "bg-amber-50 text-amber-700"
                                }
                            >
                                {res.invoice_status}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}
    </PaginatedList>
</TabsContent>

                    <TabsContent value="profile">
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-wine flex items-center justify-center">
                                        <Building2 className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">
                                            {currentUser.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {currentUser.company ||
                                                "Factory account"}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground text-xs">
                                            Email
                                        </span>
                                        <p className="font-medium">
                                            {currentUser.email}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs">
                                            Phone
                                        </span>
                                        <p className="font-medium">
                                            {currentUser.phone || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs">
                                            Location
                                        </span>
                                        <p className="font-medium">
                                            {currentUser.location || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground text-xs">
                                            Sector
                                        </span>
                                        <p className="font-medium">
                                            {currentUser.sector ||
                                                "Manufacturing"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Dialog
                    open={!!materialProfile}
                    onOpenChange={() => setMaterialProfile(null)}
                >
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="font-heading">
                                Material Profile
                            </DialogTitle>
                        </DialogHeader>
                        {materialProfile && (
                            <div className="space-y-4">
                                <div className="relative h-44 overflow-hidden rounded-2xl border">
                                    <img
                                        src={materialProfile.image_url}
                                        alt={materialProfile.material}
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4 text-white">
                                        <h3 className="text-xl font-bold">
                                            {materialProfile.material}
                                        </h3>
                                        <p className="text-sm text-white/80">
                                            {materialProfile.hub} ·{" "}
                                            {materialProfile.batchId}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl border p-3">
                                        <p className="text-xs text-muted-foreground">
                                            Available
                                        </p>
                                        <p className="font-bold">
                                            {Number(
                                                materialProfile.available_kg,
                                            ).toLocaleString()}
                                            kg
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3">
                                        <p className="text-xs text-muted-foreground">
                                            Reserved
                                        </p>
                                        <p className="font-bold">
                                            {Number(
                                                materialProfile.reserved_kg ||
                                                    0,
                                            ).toLocaleString()}
                                            kg
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3">
                                        <p className="text-xs text-muted-foreground">
                                            Grade
                                        </p>
                                        <p className="font-bold">
                                            {materialProfile.purityGrade}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3">
                                        <p className="text-xs text-muted-foreground">
                                            Price
                                        </p>
                                        <p className="font-bold">
                                            $
                                            {Number(
                                                materialProfile.price_per_kg,
                                            ).toFixed(2)}
                                            /kg
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3">
                                        <p className="text-xs text-muted-foreground">
                                            Suppliers
                                        </p>
                                        <p className="font-bold">
                                            {materialProfile.supplier_count ||
                                                0}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border p-3">
                                        <p className="text-xs text-muted-foreground">
                                            Factories
                                        </p>
                                        <p className="font-bold">
                                            {materialProfile.factory_count || 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-2xl border bg-emerald-50 p-4 text-sm text-emerald-900">
                                    {materialProfile.impact_note ||
                                        "This material is connected to live inventory, supplier contracts, factory requests and reserved stock."}
                                </div>
                                <Button
                                    onClick={() => {
                                        setShowReserve(materialProfile);
                                        setMaterialProfile(null);
                                    }}
                                    className="w-full rounded-xl bg-gradient-wine text-white"
                                >
                                    Request this material
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={!!showReserve}
                    onOpenChange={() => setShowReserve(null)}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-heading">
                                Request Material
                            </DialogTitle>
                        </DialogHeader>
                        {showReserve && (
                            <div className="space-y-4 mt-2">
                                <div className="p-3 rounded-xl bg-muted/50 border">
                                    <p className="font-semibold text-sm">
                                        {showReserve.material}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {showReserve.batchId} ·{" "}
                                        {Number(
                                            showReserve.available_kg,
                                        ).toLocaleString()}
                                        kg available · {showReserve.purityGrade}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs">
                                        Desired Quantity (kg) *
                                    </Label>
                                    <Input
                                        type="number"
                                        value={form.quantity}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                quantity: e.target.value,
                                            })
                                        }
                                        placeholder={`Max: ${showReserve.available_kg}`}
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">
                                        Discussion Date *
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.meetingDate}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                meetingDate: e.target.value,
                                            })
                                        }
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">
                                        Company Details
                                    </Label>
                                    <Input
                                        value={form.companyDetails}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                companyDetails: e.target.value,
                                            })
                                        }
                                        placeholder="Company name & sector"
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Notes</Label>
                                    <Textarea
                                        value={form.notes}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                notes: e.target.value,
                                            })
                                        }
                                        placeholder="Additional requirements..."
                                        rows={3}
                                        className="rounded-xl"
                                    />
                                </div>
                                <Button
                                    onClick={handleReserve}
                                    disabled={loading}
                                    className="w-full h-11 rounded-xl bg-gradient-wine text-white hover:opacity-90 font-semibold"
                                >
                                    <Calendar className="w-4 h-4 mr-2" /> Submit
                                    Request
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
