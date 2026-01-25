export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white p-4 flex flex-col">
      <h1 className="text-xl font-semibold mb-4">
        Knowledge AI
      </h1>

      <button className="bg-blue-600 hover:bg-blue-700 py-2 rounded mb-4">
        + Upload Document
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="p-2 bg-gray-800 rounded cursor-pointer">
          Company Handbook.pdf
        </div>
        <div className="p-2 bg-gray-800 rounded cursor-pointer">
          HR Policies.docx
        </div>
      </div>
    </aside>
  );
}
