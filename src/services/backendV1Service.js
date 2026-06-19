import { request, unwrapData } from "@/services/authService";

const API = "/api/v1";

function buildQuery(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, value);
        }
    });

    const text = query.toString();
    return text ? `?${text}` : "";
}

function unwrapList(response) {
    const data = unwrapData(response);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;

    return [];
}

function patch(url, payload = {}) {
    return request(url, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

function normalizeLocationType(type = "") {
    const raw = String(type || "").toLowerCase().trim();

    if (raw === "suppliers") return "supplier";
    if (raw === "factories") return "factory";

    return raw;
}


export const platformV1 = {
    unwrapList,
    buildQuery,

    dashboard: {
        summary: () => request(`${API}/dashboard/summary`).then(unwrapData),
        impact: () => request(`${API}/dashboard/impact`).then(unwrapData),
    },

    adminLive: {
        snapshot: (params = {}) =>
            request(`${API}/admin/live-snapshot${buildQuery(params)}`).then(
                unwrapData,
            ),
    },

    adminMessages: {
        list: (params = {}) =>
            request(
                `${API}/admin/messages${buildQuery({
                    status: "open",
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        reply: (id, payload = {}) => {
            const body =
                typeof payload === "string"
                    ? { reply: payload }
                    : {
                          reply:
                              payload.reply ??
                              payload.message ??
                              payload.text ??
                              "",
                      };

            return request(`${API}/admin/messages/${id}/reply`, {
                method: "POST",
                body: JSON.stringify(body),
            }).then(unwrapData);
        },
    },

    supplier: {
        materials: (params = {}) =>
            request(
                `${API}/supplier/materials${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        pickups: (params = {}) =>
            request(
                `${API}/supplier/pickups${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        requestPickup: (payload) =>
            request(`${API}/supplier/pickup-requests`, {
                method: "POST",
                body: JSON.stringify(payload),
            }).then(unwrapData),

        messageAdmin: (payload) => {
            const body =
                typeof payload === "string"
                    ? { message: payload }
                    : {
                          subject: payload.subject ?? null,
                          message: payload.message ?? payload.text ?? "",
                      };

            return request(`${API}/supplier/messages`, {
                method: "POST",
                body: JSON.stringify(body),
            }).then(unwrapData);
        },
    },

    marketplace: {
        materials: (params = {}) =>
            request(
                `${API}/marketplace/materials${buildQuery({
                    per_page: 100,
                    ...params,
                })}`,
            ).then(unwrapList),
    },

    hub: {
        receivingQueue: (params = {}) =>
            request(
                `${API}/hub/receiving-queue${buildQuery({
                    per_page: 100,
                    ...params,
                })}`,
            ).then(unwrapData),

        createInbound: (payload) =>
            request(`${API}/hub/inbound`, {
                method: "POST",
                body: JSON.stringify(payload),
            }).then(unwrapData),

        quality: (id, payload) =>
            patch(`${API}/hub/inbound/${id}/quality`, payload).then(unwrapData),

        bale: (id, payload) =>
            request(`${API}/hub/inbound/${id}/bale`, {
                method: "POST",
                body: JSON.stringify(payload),
            }).then(unwrapData),

        inspectPickup: (id) =>
            request(`${API}/hub/pickups/${id}/inspect`, {
                method: "POST",
            }).then(unwrapData),

        updateInboundStatus: (id, payload) =>
            patch(`${API}/hub/inbound/${id}/status`, payload).then(unwrapData),

        availableHubs: () =>
            request(`${API}/hub/available-hubs`).then(unwrapData),
    },

    users: {
        list: (params = {}) =>
            request(
                `${API}/admin/users${buildQuery({
                    per_page: 200,
                    sort: "latest",
                    ...params,
                })}`,
            ).then(unwrapList),

        show: (id) => request(`${API}/admin/users/${id}`).then(unwrapData),

        create: (payload) =>
            request(`${API}/admin/users`, {
                method: "POST",
                body: JSON.stringify(payload),
            }),

        update: (id, payload) => patch(`${API}/admin/users/${id}`, payload),

        updateStatus: (id, status) =>
            patch(`${API}/admin/users/${id}/status`, {
                employment_status: status,
            }),

        delete: (id) =>
            request(`${API}/admin/users/${id}`, {
                method: "DELETE",
            }),
    },

    locations: {
        list: (type, userId) =>
            request(
                `${API}/admin/${normalizeLocationType(type)}/users/${userId}/locations`,
            ).then(unwrapList),

        create: (type, userId, payload) =>
            request(
                `${API}/admin/${normalizeLocationType(type)}/users/${userId}/locations`,
                {
                    method: "POST",
                    body: JSON.stringify(payload),
                },
            ).then(unwrapData),

        update: (type, userId, id, payload) =>
            patch(
                `${API}/admin/${normalizeLocationType(type)}/users/${userId}/locations/${id}`,
                payload,
            ).then(unwrapData),

        delete: (type, userId, id) =>
            request(
                `${API}/admin/${normalizeLocationType(type)}/users/${userId}/locations/${id}`,
                {
                    method: "DELETE",
                },
            ).then(unwrapData),
    },

    notifications: {
        list: (params = {}) =>
            request(
                `${API}/notifications${buildQuery({
                    per_page: 8,
                    ...params,
                })}`,
            ).then(unwrapData),

        markRead: (id) => patch(`${API}/notifications/${id}/read`),

        markAllRead: () => patch(`${API}/notifications/read-all`),
    },

    pickups: {
        list: (params = {}) =>
            request(
                `${API}/admin/pickups${buildQuery({
                    per_page: 200,
                    sort: "latest",
                    ...params,
                })}`,
            ).then(unwrapList),

        create: (payload) =>
            request(`${API}/admin/pickups`, {
                method: "POST",
                body: JSON.stringify(payload),
            }),

        cancel: (id) => patch(`${API}/admin/pickups/${id}/cancel`),

        dispatch: (id, payload = {}) =>
            patch(`${API}/admin/pickups/${id}/dispatch`, {
                driver_employee_id:
                    payload.driver_employee_id ??
                    payload.driver_id ??
                    payload.employee_id ??
                    payload.driver,
                truck_id:
                    payload.truck_id ?? payload.vehicle_id ?? payload.truck,
                supplier_location_id:
                    payload.supplier_location_id ??
                    payload.location_id ??
                    payload.supplierLocationId,
            }).then(unwrapData),
    },

    trucks: {
        list: (params = {}) =>
            request(
                `${API}/admin/trucks${buildQuery({
                    per_page: 200,
                    sort: "latest",
                    ...params,
                })}`,
            ).then(unwrapList),

        show: (id) => request(`${API}/admin/trucks/${id}`).then(unwrapData),

        create: (payload) =>
            request(`${API}/admin/trucks`, {
                method: "POST",
                body: JSON.stringify(payload),
            }),

        update: (id, payload) => patch(`${API}/admin/trucks/${id}`, payload),

        updateStatus: (id, status) =>
            patch(`${API}/admin/trucks/${id}/status`, { status }),
    },

    hubs: {
        list: (params = {}) =>
            request(
                `${API}/admin/hubs${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        show: (id) => request(`${API}/admin/hubs/${id}`).then(unwrapData),

        create: (payload) =>
            request(`${API}/admin/hubs`, {
                method: "POST",
                body: JSON.stringify(payload),
            }),

        update: (id, payload) => patch(`${API}/admin/hubs/${id}`, payload),

        delete: (id) =>
            request(`${API}/admin/hubs/${id}`, {
                method: "DELETE",
            }),
    },

    commodities: {
        list: (params = {}) =>
            request(
                `${API}/admin/commodities${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        show: (id) =>
            request(`${API}/admin/commodities/${id}`).then(unwrapData),

        create: (payload) =>
            request(`${API}/admin/commodities`, {
                method: "POST",
                body: JSON.stringify(payload),
            }),

        update: (id, payload) =>
            patch(`${API}/admin/commodities/${id}`, payload),

        setPrice: (id, price) => {
            if (!id) throw new Error("Select a material first.");

            const numericPrice = Number(price);

            if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
                throw new Error("Enter a valid positive price.");
            }

            return request(`${API}/admin/commodities/${id}/prices`, {
                method: "POST",
                body: JSON.stringify({ price: numericPrice }),
            }).then(unwrapData);
        },
    },

    applications: {
        list: (params = {}) =>
            request(
                `${API}/admin/applications${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        updateStatus: (id, payload) =>
            patch(`${API}/admin/applications/${id}/status`, payload).then(
                unwrapData,
            ),
    },

    contracts: {
        list: (params = {}) =>
            request(
                `${API}/admin/contracts${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        update: (id, payload) => patch(`${API}/admin/contracts/${id}`, payload),

        status: (id, status) =>
            patch(`${API}/admin/contracts/${id}/status`, { status }),
    },

    outbound: {
        list: (params = {}) =>
            request(
                `${API}/admin/outbound${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        ship: (id) => patch(`${API}/admin/outbound/${id}/ship`),
    },

    invoices: {
        list: (params = {}) =>
            request(
                `${API}/admin/invoices${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        markPaid: (id) => patch(`${API}/admin/invoices/${id}/mark-paid`),
    },

    driver: {
        pickups: (params = {}) =>
            request(
                `${API}/driver/pickups${buildQuery({
                    per_page: 200,
                    sort: "latest",
                    ...params,
                })}`,
            ).then(unwrapList),

        start: (id) =>
            patch(`${API}/driver/pickups/${id}/start`).then(unwrapData),

        recordWeight: (id, estimated_weight) =>
            patch(`${API}/driver/pickups/${id}/weight`, {
                estimated_weight,
            }).then(unwrapData),

        uploadPhoto: (id, file, proof_note = "Driver uploaded proof photo") => {
            const form = new FormData();
            form.append("photo", file);
            form.append("proof_note", proof_note);

            return request(`${API}/driver/pickups/${id}/photos`, {
                method: "POST",
                body: form,
            }).then(unwrapData);
        },

        departToHub: (id) =>
            patch(`${API}/driver/pickups/${id}/depart-to-hub`).then(unwrapData),

        complete: (id, payload = {}) =>
            patch(`${API}/driver/pickups/${id}/complete`, payload).then(
                unwrapData,
            ),

        reportProblem: (id, payload) =>
            request(`${API}/driver/pickups/${id}/problem-reports`, {
                method: "POST",
                body: JSON.stringify(payload),
            }).then(unwrapData),

        availableHubs: () =>
            request(`${API}/driver/available-hubs`).then(unwrapData),
    },

    factory: {
        materialRequests: (params = {}) =>
            request(
                `${API}/material-requests${buildQuery({
                    per_page: 100,
                    ...params,
                })}`,
            ).then(unwrapList),

        createMaterialRequest: (payload) =>
            request(`${API}/material-requests`, {
                method: "POST",
                body: JSON.stringify(payload),
            }).then(unwrapData),

        matchMaterialRequest: (id, payload = {}) =>
            patch(`${API}/material-requests/${id}/match`, payload).then(
                unwrapData,
            ),

        scheduleMaterialRequest: (id, payload = {}) =>
            patch(`${API}/material-requests/${id}/schedule`, payload).then(
                unwrapData,
            ),

        shipMaterialRequest: (id) =>
            patch(`${API}/material-requests/${id}/ship`).then(unwrapData),

        adminConfirmMaterialRequest: (id) =>
            patch(`${API}/material-requests/${id}/admin-confirm`).then(
                unwrapData,
            ),

        rejectMaterialRequest: (id, reason = "Rejected by admin") =>
            patch(`${API}/material-requests/${id}/reject`, {
                rejection_reason: reason,
            }).then(unwrapData),

        deliveries: (params = {}) =>
            request(
                `${API}/factory/deliveries${buildQuery({
                    per_page: 10,
                    ...params,
                })}`,
            ).then(unwrapList),

        confirmDelivery: (id) =>
            patch(`${API}/factory/deliveries/${id}/confirm`).then(unwrapData),

        rejectDelivery: (id, rejection_reason) =>
            request(`${API}/factory/deliveries/${id}/reject`, {
                method: "POST",
                body: JSON.stringify({ rejection_reason }),
            }).then(unwrapData),
    },

    graduation: {
        overview: async () => {
            try {
                const response = await request(`${API}/graduation/overview`);
                const data =
                    unwrapData(response) || response?.data || response || {};

                return (
                    data?.overview ||
                    data?.data?.overview ||
                    data?.data ||
                    data || {
                        executive_summary: {},
                        next_actions: [],
                        alerts: [],
                        material_analytics: [],
                        rankings: {
                            hubs: [],
                            drivers: [],
                            suppliers: [],
                        },
                        feature_checklist: [],
                    }
                );
            } catch (error) {
                console.error("Graduation overview failed:", error);

                return {
                    executive_summary: {},
                    next_actions: [],
                    alerts: [],
                    material_analytics: [],
                    rankings: {
                        hubs: [],
                        drivers: [],
                        suppliers: [],
                    },
                    feature_checklist: [],
                };
            }
        },

        features: async () => {
            try {
                const response = await request(`${API}/graduation/features`);
                return unwrapData(response) || {};
            } catch {
                return {};
            }
        },
    },

    ai: {
        chat: (message, history = []) =>
            request(`${API}/ai/chat`, {
                method: "POST",
                body: JSON.stringify({ message, history }),
            }).then(unwrapData),
    },
};
