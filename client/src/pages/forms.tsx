import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FileText, 
  Save, 
  Share,
  Download,
  Eye,
  Edit,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Table,
  Image,
  Link,
  MoreHorizontal,
  ChevronDown,
  User,
  Settings,
  Search
} from "lucide-react";

interface DocumentForm {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  type: 'form' | 'template' | 'document';
  status: 'draft' | 'published';
}

const mockDocuments: DocumentForm[] = [
  {
    id: "doc_1",
    title: "Patient Intake Form",
    content: "<h1>Patient Information Form</h1><p>Please fill out the following information completely and accurately.</p><h2>Personal Information</h2><p><strong>Full Name:</strong> ________________</p><p><strong>Date of Birth:</strong> ________________</p><p><strong>Phone Number:</strong> ________________</p><p><strong>Email Address:</strong> ________________</p><h2>Medical History</h2><p><strong>Current Medications:</strong></p><p>________________</p><p><strong>Known Allergies:</strong></p><p>________________</p><p><strong>Previous Surgeries:</strong></p><p>________________</p>",
    lastModified: "2025-01-08T10:30:00Z",
    type: 'form',
    status: 'published'
  },
  {
    id: "doc_2", 
    title: "Consent Form Template",
    content: "<h1>Medical Consent Form</h1><p>I, ________________, hereby give my consent for medical treatment.</p><p><strong>Date:</strong> ________________</p><p><strong>Patient Signature:</strong> ________________</p>",
    lastModified: "2025-01-07T14:15:00Z",
    type: 'template',
    status: 'draft'
  }
];

export default function FormsPage() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentForm | null>(mockDocuments[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [documentContent, setDocumentContent] = useState(selectedDocument?.content || "");
  const [documentTitle, setDocumentTitle] = useState(selectedDocument?.title || "");
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Document Saved",
      description: "Your form has been saved successfully.",
    });
  };

  const handleShare = () => {
    toast({
      title: "Share Link Created",
      description: "Form sharing link has been copied to clipboard.",
    });
  };

  const handleNewDocument = () => {
    const newDoc: DocumentForm = {
      id: `doc_${Date.now()}`,
      title: "Untitled Form",
      content: "<h1>New Form</h1><p>Start creating your form here...</p>",
      lastModified: new Date().toISOString(),
      type: 'form',
      status: 'draft'
    };
    setSelectedDocument(newDoc);
    setDocumentTitle(newDoc.title);
    setDocumentContent(newDoc.content);
    setIsEditing(true);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header title="Form Editor" />
      
      {/* Top Navigation */}
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Cura Forms</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewDocument}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 border-r bg-gray-50 p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search forms..." 
                className="pl-10 bg-white"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Forms</h3>
            {mockDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDocument(doc);
                  setDocumentTitle(doc.title);
                  setDocumentContent(doc.content);
                  setIsEditing(false);
                }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDocument?.id === doc.id 
                    ? 'bg-blue-100 border border-blue-200' 
                    : 'bg-white hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.status === 'published' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.status}
                  </span>
                </div>
                <h4 className="font-medium text-sm mt-2 text-gray-900">{doc.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Modified {new Date(doc.lastModified).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {selectedDocument && (
            <>
              {/* Document Header */}
              <div className="border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        className="text-xl font-semibold border-none shadow-none p-0 focus:ring-0"
                        placeholder="Document title..."
                      />
                    ) : (
                      <h1 className="text-xl font-semibold text-gray-900">{documentTitle}</h1>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Last modified {new Date(selectedDocument.lastModified).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={isEditing ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {isEditing ? "Done" : "Edit"}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              {isEditing && (
                <div className="border-b bg-gray-50 px-6 py-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm">
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Underline className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6" />
                    
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm">
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6" />
                    
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm">
                        <List className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6" />
                    
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm">
                        <Table className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6" />
                    
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Editor Content */}
              <div className="flex-1 bg-white">
                <div className="max-w-4xl mx-auto p-8">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={documentContent}
                        onChange={(e) => setDocumentContent(e.target.value)}
                        className="w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Start typing your form content here..."
                      />
                      <div className="text-sm text-gray-500">
                        Tip: Use HTML tags for formatting or use the toolbar above
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: documentContent }}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}