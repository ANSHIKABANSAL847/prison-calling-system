"use client";

import { Search, Filter } from "lucide-react";
import FilterSelect from "./FilterSelect";

interface FilterBarProps {
    searchInput: string;
    setSearchInput: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
    dateFrom: string;
    setDateFrom: (v: string) => void;
    dateTo: string;
    setDateTo: (v: string) => void;
    similarityMin: string;
    setSimilarityMin: (v: string) => void;
    similarityMax: string;
    setSimilarityMax: (v: string) => void;
    showAdvanced: boolean;
    setShowAdvanced: (v: boolean) => void;
    onSearch: (e: React.FormEvent) => void;
    onApply: () => void;
}

export default function FilterBar({
    searchInput, setSearchInput,
    statusFilter, setStatusFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    similarityMin, setSimilarityMin,
    similarityMax, setSimilarityMax,
    showAdvanced, setShowAdvanced,
    onSearch, onApply,
}: FilterBarProps) {

    function handleDateRangeChange(v: string) {
        const now = new Date();
        if (v === "Today") {
            setDateFrom(now.toISOString().slice(0, 10));
            setDateTo(now.toISOString().slice(0, 10));
        } else if (v === "Last 7 Days") {
            const d = new Date(now); d.setDate(d.getDate() - 7);
            setDateFrom(d.toISOString().slice(0, 10));
            setDateTo(now.toISOString().slice(0, 10));
        } else if (v === "Last 30 Days") {
            const d = new Date(now); d.setDate(d.getDate() - 30);
            setDateFrom(d.toISOString().slice(0, 10));
            setDateTo(now.toISOString().slice(0, 10));
        } else if (v === "Last 60 Days") {
            const d = new Date(now); d.setDate(d.getDate() - 60);
            setDateFrom(d.toISOString().slice(0, 10));
            setDateTo(now.toISOString().slice(0, 10));
        }
    }

    function handleSimilarityChange(v: string) {
        if (v === "≥ 90%") { setSimilarityMin("90"); setSimilarityMax(""); }
        else if (v === "≥ 80%") { setSimilarityMin("80"); setSimilarityMax(""); }
        else if (v === "≥ 70%") { setSimilarityMin("70"); setSimilarityMax(""); }
        else if (v === "< 70%") { setSimilarityMin(""); setSimilarityMax("69"); }
    }

    return (
        <div
            className="p-4 space-y-3"
            style={{ background: "#fff", border: "1px solid #CBD0D8", borderTop: "3px solid #0B1F4B", borderRadius: 4 }}
        >
            {/* Primary filter row */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <form onSubmit={onSearch} className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search session, agent, contact…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </form>

                <FilterSelect
                    label="Date Range"
                    options={["Today", "Last 7 Days", "Last 30 Days", "Last 60 Days"]}
                    value=""
                    onChange={handleDateRangeChange}
                />

                <FilterSelect
                    label="Verification Status"
                    options={["Verified", "Failed", "Pending"]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />

                <FilterSelect
                    label="Similarity Score"
                    options={["≥ 90%", "≥ 80%", "≥ 70%", "< 70%"]}
                    value=""
                    onChange={handleSimilarityChange}
                />

                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest transition cursor-pointer"
                    style={{ border: "1px solid #CBD0D8", color: "#0B1F4B", borderRadius: 3 }}
                >
                    <Filter className="w-3.5 h-3.5" />
                    Advanced Filters
                </button>

                <button
                    onClick={onApply}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest transition cursor-pointer"
                    style={{ background: "#0B1F4B", color: "#C9A227", borderRadius: 3 }}
                >
                    Apply Filters
                </button>
            </div>

            {/* Advanced filters panel */}
            {showAdvanced && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-gray-600 whitespace-nowrap">Date From:</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-gray-600 whitespace-nowrap">Date To:</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-gray-600 whitespace-nowrap">Similarity Min (%):</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={similarityMin}
                            onChange={(e) => setSimilarityMin(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-gray-600 whitespace-nowrap">Similarity Max (%):</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={similarityMax}
                            onChange={(e) => setSimilarityMax(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
