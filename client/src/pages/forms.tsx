import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, Plus, Share, Settings, User, Save, Eye, Download, Upload, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image, Link, Table, Bookmark, Search, Undo, Redo,
  Printer, Palette, Type, Users, MoreHorizontal, ChevronDown, Folder
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Header Bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Cura Forms</span>
          </div>
          
          <nav className="flex items-center space-x-8">
            <button className="text-gray-600 hover:text-gray-900 font-medium">Dashboard</button>
            <button className="text-gray-600 hover:text-gray-900 font-medium">Documents</button>
            <button className="text-purple-600 font-medium border-b-2 border-purple-600 pb-1">PDF Forms</button>
            <button className="text-gray-600 hover:text-gray-900 font-medium">Contacts</button>
            <button className="text-gray-600 hover:text-gray-900 font-medium">User Management</button>
          </nav>
        </div>
        
        <div className="flex items-center space-x-3">
          <Search className="h-5 w-5 text-gray-500" />
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Invite
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Secondary Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Folder className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Documents</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Fatima Zahra</span>
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">FZ</span>
          </div>
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={handleNewDocument}>
            <Plus className="h-4 w-4" />
            <span className="text-xs ml-1">New</span>
          </Button>
          <Button variant="ghost" size="sm">
            <Folder className="h-4 w-4" />
            <span className="text-xs ml-1">Open</span>
          </Button>
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4" />
            <span className="text-xs ml-1">Templates</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
            <span className="text-xs ml-1">Save</span>
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
            <span className="text-xs ml-1">Export</span>
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          <Button variant="ghost" size="sm">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Redo className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          <Button variant="ghost" size="sm">
            <Image className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Table className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Link className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Bookmark className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          <Button variant="ghost" size="sm">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex items-center space-x-4">
          <Select defaultValue="calibri">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calibri">Calibri</SelectItem>
              <SelectItem value="arial">Arial</SelectItem>
              <SelectItem value="times">Times New Roman</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="11">
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8">8</SelectItem>
              <SelectItem value="9">9</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="11">11</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="18">18</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
          
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
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <Button variant="ghost" size="sm">
              <Palette className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <Button variant="ghost" size="sm">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <AlignJustify className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <Select defaultValue="normal">
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="heading1">Heading 1</SelectItem>
                <SelectItem value="heading2">Heading 2</SelectItem>
                <SelectItem value="heading3">Heading 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Document Editor */}
      <div className="flex-1 bg-gray-100 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          <div className="w-full max-w-4xl h-full bg-white shadow-sm mx-6 my-4 overflow-y-auto">
            <div className="p-16">
              {isEditing ? (
                <textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  className="w-full h-96 resize-none border-none outline-none font-calibri text-base leading-relaxed"
                  placeholder="Start typing your document here..."
                />
              ) : (
                <div 
                  className="prose prose-lg max-w-none min-h-96 font-calibri text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: documentContent }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}