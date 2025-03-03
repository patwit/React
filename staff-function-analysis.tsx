import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const StaffFunctionAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('civilServants');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await window.fs.readFile('Salary2.csv', { encoding: 'utf8' });
        
        Papa.parse(response, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (result) => {
            // Process the data
            const processedData = processData(result.data);
            setData(processedData);
            setLoading(false);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error loading file:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const processData = (rawData) => {
    // Define the staff types we want to focus on
    const targetStaffTypes = ['ข้าราชการ', 'พนักงานมหาวิทยาลัย'];
    
    // Create a nested analysis structure
    const analysisByTypeAndFunction = {};
    
    rawData.forEach(row => {
      const staffType = row['ประเภทบุคลากร'];
      const jobFunction = row['สายงาน'];
      
      // Skip if not one of our target staff types or job function is missing
      if (!targetStaffTypes.includes(staffType) || !jobFunction) {
        return;
      }
      
      // Calculate total compensation
      const totalComp = (row['เงินเดือน'] || 0) + 
                        (row['เงินประจำตำแหน่ง'] || 0) + 
                        (row['ค่าตอบแทนเงินประจำตำแหน่ง'] || 0) + 
                        (row['เงินตำแหน่งบริหาร'] || 0);
      
      // Initialize nested structure if needed
      if (!analysisByTypeAndFunction[staffType]) {
        analysisByTypeAndFunction[staffType] = {};
      }
      
      if (!analysisByTypeAndFunction[staffType][jobFunction]) {
        analysisByTypeAndFunction[staffType][jobFunction] = {
          count: 0,
          totalCost: 0,
          min: Infinity,
          max: -Infinity,
          salaries: []
        };
      }
      
      // Update the statistics
      const stats = analysisByTypeAndFunction[staffType][jobFunction];
      stats.count += 1;
      stats.totalCost += totalComp;
      stats.min = Math.min(stats.min, totalComp);
      stats.max = Math.max(stats.max, totalComp);
      stats.salaries.push(totalComp);
    });
    
    // Format the data for visualization
    const formattedData = {};
    
    for (const staffType in analysisByTypeAndFunction) {
      const jobFunctions = Object.entries(analysisByTypeAndFunction[staffType])
        .map(([name, stats]) => {
          // Calculate average
          const average = stats.totalCost / stats.count;
          
          // Calculate median
          const sortedSalaries = [...stats.salaries].sort((a, b) => a - b);
          const middle = Math.floor(sortedSalaries.length / 2);
          const median = sortedSalaries.length % 2 === 0
            ? (sortedSalaries[middle - 1] + sortedSalaries[middle]) / 2
            : sortedSalaries[middle];

          return {
            name,
            count: stats.count,
            totalCost: stats.totalCost,
            averageCost: Math.round(average),
            medianCost: Math.round(median),
            min: stats.min,
            max: stats.max
          };
        })
        .sort((a, b) => b.count - a.count);
        
      // Calculate totals
      const totalEmployees = jobFunctions.reduce((sum, item) => sum + item.count, 0);
      const totalCost = jobFunctions.reduce((sum, item) => sum + item.totalCost, 0);
      
      formattedData[staffType] = {
        jobFunctions,
        totalEmployees,
        totalCost
      };
    }
    
    return formattedData;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-red-600">ไม่สามารถโหลดข้อมูลได้</p>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const TabButton = ({ id, label, active, onClick }) => (
    <button
      className={`px-4 py-2 mx-1 rounded-t-lg ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
      onClick={() => onClick(id)}
    >
      {label}
    </button>
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('th-TH', { 
      style: 'currency', 
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-300 rounded shadow-md">
          <p className="font-semibold">{`${label}`}</p>
          <p className="text-blue-600">{`ค่าเฉลี่ย: ${formatCurrency(payload[0].value)}`}</p>
          {payload[0].payload.count && (
            <p className="text-gray-600">{`จำนวนบุคลากร: ${payload[0].payload.count.toLocaleString()}`}</p>
          )}
          {payload[0].payload.medianCost && (
            <p className="text-gray-600">{`ค่ามัธยฐาน: ${formatCurrency(payload[0].payload.medianCost)}`}</p>
          )}
          {payload[0].payload.min && (
            <p className="text-gray-600">{`ต่ำสุด: ${formatCurrency(payload[0].payload.min)}`}</p>
          )}
          {payload[0].payload.max && (
            <p className="text-gray-600">{`สูงสุด: ${formatCurrency(payload[0].payload.max)}`}</p>
          )}
          {payload[0].payload.totalCost && (
            <p className="text-green-600">{`ค่าใช้จ่ายรวม: ${formatCurrency(payload[0].payload.totalCost)}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCivilServants = () => {
    const staffType = 'ข้าราชการ';
    const staffData = data[staffType];
    
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">จำนวนข้าราชการทั้งหมด</h3>
            <p className="text-3xl font-bold text-blue-700">{staffData.totalEmployees.toLocaleString()}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">ค่าใช้จ่ายรวมต่อเดือน</h3>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(staffData.totalCost)}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">ค่าตอบแทนเฉลี่ยต่อคน</h3>
            <p className="text-3xl font-bold text-purple-700">{formatCurrency(staffData.totalCost / staffData.totalEmployees)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนเฉลี่ยตามสายงาน (ข้าราชการ)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={staffData.jobFunctions} 
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="averageCost" name="ค่าตอบแทนเฉลี่ย" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">สัดส่วนบุคลากรตามสายงาน (ข้าราชการ)</h2>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={staffData.jobFunctions}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {staffData.jobFunctions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">รายละเอียดค่าตอบแทนตามสายงาน (ข้าราชการ)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2">สายงาน</th>
                  <th className="border border-gray-300 p-2">จำนวน</th>
                  <th className="border border-gray-300 p-2">% ของทั้งหมด</th>
                  <th className="border border-gray-300 p-2">ค่าตอบแทนเฉลี่ย</th>
                  <th className="border border-gray-300 p-2">ค่ามัธยฐาน</th>
                  <th className="border border-gray-300 p-2">ต่ำสุด</th>
                  <th className="border border-gray-300 p-2">สูงสุด</th>
                  <th className="border border-gray-300 p-2">ค่าใช้จ่ายรวม</th>
                  <th className="border border-gray-300 p-2">% ของงบประมาณ</th>
                </tr>
              </thead>
              <tbody>
                {staffData.jobFunctions.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2">{item.name}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.count.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2 text-right">
                      {((item.count / staffData.totalEmployees) * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.averageCost)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.medianCost)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.min)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.max)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.totalCost)}</td>
                    <td className="border border-gray-300 p-2 text-right">
                      {((item.totalCost / staffData.totalCost) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderUniversityEmployees = () => {
    const staffType = 'พนักงานมหาวิทยาลัย';
    const staffData = data[staffType];
    
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">จำนวนพนักงานมหาวิทยาลัยทั้งหมด</h3>
            <p className="text-3xl font-bold text-blue-700">{staffData.totalEmployees.toLocaleString()}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">ค่าใช้จ่ายรวมต่อเดือน</h3>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(staffData.totalCost)}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">ค่าตอบแทนเฉลี่ยต่อคน</h3>
            <p className="text-3xl font-bold text-purple-700">{formatCurrency(staffData.totalCost / staffData.totalEmployees)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนเฉลี่ยตามสายงาน (พนักงานมหาวิทยาลัย)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={staffData.jobFunctions} 
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="averageCost" name="ค่าตอบแทนเฉลี่ย" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">สัดส่วนบุคลากรตามสายงาน (พนักงานมหาวิทยาลัย)</h2>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={staffData.jobFunctions}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {staffData.jobFunctions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">รายละเอียดค่าตอบแทนตามสายงาน (พนักงานมหาวิทยาลัย)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2">สายงาน</th>
                  <th className="border border-gray-300 p-2">จำนวน</th>
                  <th className="border border-gray-300 p-2">% ของทั้งหมด</th>
                  <th className="border border-gray-300 p-2">ค่าตอบแทนเฉลี่ย</th>
                  <th className="border border-gray-300 p-2">ค่ามัธยฐาน</th>
                  <th className="border border-gray-300 p-2">ต่ำสุด</th>
                  <th className="border border-gray-300 p-2">สูงสุด</th>
                  <th className="border border-gray-300 p-2">ค่าใช้จ่ายรวม</th>
                  <th className="border border-gray-300 p-2">% ของงบประมาณ</th>
                </tr>
              </thead>
              <tbody>
                {staffData.jobFunctions.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2">{item.name}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.count.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2 text-right">
                      {((item.count / staffData.totalEmployees) * 100).toFixed(1)}%
                    </td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.averageCost)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.medianCost)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.min)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.max)}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.totalCost)}</td>
                    <td className="border border-gray-300 p-2 text-right">
                      {((item.totalCost / staffData.totalCost) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-6">ค่าตอบแทนตามประเภทบุคลากรและสายงาน</h1>
      
      <div className="mb-4 flex">
        <TabButton 
          id="civilServants" 
          label="ข้าราชการ" 
          active={activeTab === 'civilServants'} 
          onClick={setActiveTab} 
        />
        <TabButton 
          id="universityEmployees" 
          label="พนักงานมหาวิทยาลัย" 
          active={activeTab === 'universityEmployees'} 
          onClick={setActiveTab} 
        />
      </div>

      {activeTab === 'civilServants' && renderCivilServants()}
      {activeTab === 'universityEmployees' && renderUniversityEmployees()}

      <div className="mt-8 bg-yellow-50 p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2 text-yellow-800">ข้อสังเกตสำคัญ</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><span className="font-semibold">ความแตกต่างของค่าตอบแทนระหว่างสายงาน:</span> ทั้งในกลุ่มข้าราชการและพนักงานมหาวิทยาลัย สายงานวิชาการได้รับค่าตอบแทนสูงกว่าสายงานสนับสนุนอย่างมีนัยสำคัญ</li>
          <li><span className="font-semibold">สัดส่วนบุคลากร:</span> ข้าราชการส่วนใหญ่อยู่ในสายงานวิชาการ ในขณะที่พนักงานมหาวิทยาลัยส่วนใหญ่อยู่ในสายงานสนับสนุน</li>
          <li><span className="font-semibold">การกระจายงบประมาณ:</span> สำหรับพนักงานมหาวิทยาลัย แม้สายงานสนับสนุนจะมีจำนวนมากกว่าสายวิชาการมาก แต่สัดส่วนงบประมาณใกล้เคียงกัน สะท้อนความแตกต่างของค่าตอบแทน</li>
          <li><span className="font-semibold">ช่องว่างของค่าตอบแทน:</span> พบช่องว่างสูงระหว่างค่าตอบแทนต่ำสุดและสูงสุดในแต่ละสายงาน ควรพิจารณาความเป็นธรรมภายในกลุ่ม</li>
        </ul>
      </div>

      <div className="mt-4 bg-blue-50 p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2 text-blue-800">ข้อเสนอแนะเชิงกลยุทธ์</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><span className="font-semibold">ทบทวนโครงสร้างค่าตอบแทน:</span> พิจารณาลดช่องว่างค่าตอบแทนระหว่างสายงานวิชาการและสายงานสนับสนุนที่มีคุณวุฒิและประสบการณ์ใกล้เคียงกัน</li>
          <li><span className="font-semibold">กำหนดเส้นทางความก้าวหน้า:</span> สร้างเส้นทางความก้าวหน้าที่ชัดเจนสำหรับสายงานสนับสนุน เพื่อสร้างแรงจูงใจและรักษาบุคลากรที่มีศักยภาพ</li>
          <li><span className="font-semibold">ปรับสมดุลงบประมาณ:</span> วิเคราะห์ความคุ้มค่าของการจ้างงานสายสนับสนุนจำนวนมาก และพิจารณานำเทคโนโลยีมาทดแทนบางตำแหน่ง</li>
          <li><span className="font-semibold">พัฒนาระบบประเมินผลงาน:</span> ปรับปรุงระบบประเมินผลงานให้สะท้อนผลิตภาพและคุณภาพงานมากขึ้น แทนการเน้นที่อายุงาน</li>
        </ul>
      </div>
    </div>
  );
};

export default StaffFunctionAnalysis;