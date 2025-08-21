import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const FontTestPage = () => {
  const [, setLocation] = useLocation();

  const testText = "The quick brown fox jumps over the lazy dog";
  const criticalChars = "f t y g q";
  const numbers = "1234567890";
  const sentences = [
    "Typography quality affects user experience",
    "fog gym qty style guide testing",
    "Professional medical software design"
  ];

  const fontSizes = [12, 16, 20, 24, 32, 48];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Font Comparison Tool</h1>
            <p className="text-gray-600 mt-2">Figtree vs Roboto Typography Analysis</p>
          </div>
          <Button onClick={() => setLocation('/dashboard')} variant="outline">
            ← Back to Dashboard
          </Button>
        </div>

        {/* Critical Characters Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Critical Character Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[16, 24, 32].map(size => (
                <div key={size} className="border-b last:border-b-0 pb-6 last:pb-0">
                  <h3 className="text-lg font-semibold mb-4">{size}px Size</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-600">Figtree</h4>
                      <div 
                        className="p-4 bg-blue-50 border rounded text-center"
                        style={{ 
                          fontFamily: "'Figtree', 'FigtreeLocal', 'FigtreeForced', sans-serif",
                          fontSize: `${size}px`,
                          lineHeight: 1.5
                        }}
                      >
                        {criticalChars}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-600">Roboto</h4>
                      <div 
                        className="p-4 bg-gray-50 border rounded text-center"
                        style={{ 
                          fontFamily: "'Roboto', sans-serif",
                          fontSize: `${size}px`,
                          lineHeight: 1.5
                        }}
                      >
                        {criticalChars}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-green-600">System Default</h4>
                      <div 
                        className="p-4 bg-green-50 border rounded text-center"
                        style={{ 
                          fontFamily: "system-ui, sans-serif",
                          fontSize: `${size}px`,
                          lineHeight: 1.5
                        }}
                      >
                        {criticalChars}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Numeric Display Test */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Numeric Display Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-blue-600">Figtree Numbers</h4>
                {[16, 24, 32].map(size => (
                  <div key={size} className="space-y-1">
                    <div className="text-xs text-gray-500">{size}px</div>
                    <div 
                      className="p-3 bg-blue-50 border rounded text-center"
                      style={{ 
                        fontFamily: "'Figtree', 'FigtreeLocal', 'FigtreeForced', sans-serif",
                        fontSize: `${size}px`,
                        fontWeight: 400
                      }}
                    >
                      {numbers}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-600">Roboto Numbers</h4>
                {[16, 24, 32].map(size => (
                  <div key={size} className="space-y-1">
                    <div className="text-xs text-gray-500">{size}px</div>
                    <div 
                      className="p-3 bg-gray-50 border rounded text-center"
                      style={{ 
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: `${size}px`,
                        fontWeight: 400
                      }}
                    >
                      {numbers}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-green-600">System Numbers</h4>
                {[16, 24, 32].map(size => (
                  <div key={size} className="space-y-1">
                    <div className="text-xs text-gray-500">{size}px</div>
                    <div 
                      className="p-3 bg-green-50 border rounded text-center"
                      style={{ 
                        fontFamily: "system-ui, sans-serif",
                        fontSize: `${size}px`,
                        fontWeight: 400
                      }}
                    >
                      {numbers}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentence Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sentence Readability Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {sentences.map((sentence, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <h4 className="font-medium mb-4 text-gray-700">"{sentence}"</h4>
                <div className="space-y-4">
                  {[12, 16, 24].map(size => (
                    <div key={size} className="border-l-4 border-gray-200 pl-4">
                      <div className="text-xs text-gray-500 mb-2">{size}px Comparison</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-blue-600">Figtree</div>
                          <div 
                            className="p-3 bg-blue-50 border rounded"
                            style={{ 
                              fontFamily: "'Figtree', 'FigtreeLocal', 'FigtreeForced', sans-serif",
                              fontSize: `${size}px`,
                              lineHeight: 1.5
                            }}
                          >
                            {sentence}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-600">Roboto</div>
                          <div 
                            className="p-3 bg-gray-50 border rounded"
                            style={{ 
                              fontFamily: "'Roboto', sans-serif",
                              fontSize: `${size}px`,
                              lineHeight: 1.5
                            }}
                          >
                            {sentence}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Analysis Guide */}
        <Card>
          <CardHeader>
            <CardTitle>What to Look For: Figtree Characteristics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">Figtree Should Show:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Double-storey "g"</strong>: Two circular parts instead of one</li>
                  <li>• <strong>Curved "f" and "t"</strong>: More playful, rounded endings</li>
                  <li>• <strong>Soft "y"</strong>: Gentler descender curve</li>
                  <li>• <strong>Wider spacing</strong>: More relaxed character spacing</li>
                  <li>• <strong>Higher x-height</strong>: Lowercase letters appear taller</li>
                  <li>• <strong>Friendly numerals</strong>: More rounded, approachable numbers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-600 mb-2">Roboto Comparison:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Single-storey "g"</strong>: More angular, simple shape</li>
                  <li>• <strong>Straighter "f" and "t"</strong>: More geometric endings</li>
                  <li>• <strong>Angular "y"</strong>: Sharper descender</li>
                  <li>• <strong>Tighter spacing</strong>: More compact letterforms</li>
                  <li>• <strong>Standard x-height</strong>: Traditional proportions</li>
                  <li>• <strong>Geometric numerals</strong>: More mechanical appearance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FontTestPage;