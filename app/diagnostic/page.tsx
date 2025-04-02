import DiagnosticTool from "../components/DiagnosticTool";

export default function DiagnosticPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Inventory System Diagnostics</h1>
        <p className="text-gray-600">Use this tool to diagnose issues with the inventory system.</p>
      </div>
      
      <div className="grid gap-6">
        <DiagnosticTool />
        
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Common Issues & Solutions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium text-red-700">Foreign Key Constraints</h3>
              <p className="text-sm text-gray-600 mb-2">
                If you see errors about foreign key constraints, it means the product has related records in other tables.
              </p>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                <p className="font-medium">Solutions:</p>
                <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                  <li>Use "Mark as Inactive" instead of deleting the product</li>
                  <li>Delete the related sales records first (not recommended)</li>
                  <li>Add a status field to track product state without deletion</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium text-amber-700">Permission Issues</h3>
              <p className="text-sm text-gray-600 mb-2">
                If you see "permission denied" errors, your database user might not have the proper permissions.
              </p>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                <p className="font-medium">Solutions:</p>
                <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                  <li>Check Row Level Security policies in Supabase</li>
                  <li>Ensure you're properly authenticated</li>
                  <li>Contact your database administrator</li>
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium text-blue-700">Schema Issues</h3>
              <p className="text-sm text-gray-600 mb-2">
                If "Mark as Inactive" doesn't work, your table might be missing the status field.
              </p>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                <p className="font-medium">Solutions:</p>
                <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                  <li>Add a status column to your products table</li>
                  <li>Use the Supabase interface to add the column</li>
                  <li>Run SQL: ALTER TABLE products ADD COLUMN status TEXT;</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 