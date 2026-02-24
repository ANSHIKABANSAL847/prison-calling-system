import PrisonerProfile from "./components/PrisonerProfile";
import AuthorizedContacts from "./components/AuthorizedContacts";
import CallHistory from "./components/CallHistory";
import StatsCards from "./components/StatsCards";

export default function PrisonerDetailsPage() {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="grid grid-cols-3 gap-6">
        {/* Left side */}
        <div className="col-span-2 space-y-6">
          <PrisonerProfile />
          <AuthorizedContacts />
          <StatsCards />
        </div>

        {/* Right side */}
        <div className="col-span-1">
          <CallHistory />
        </div>
      </div>
    </div>
  );
}