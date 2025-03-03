import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const SalaryDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
    // Calculate total compensation for each employee
    rawData.forEach(row => {
      row.totalCompensation = (row['เงินเดือน'] || 0) + 
                             (row['เงินประจำตำแหน่ง'] || 0) + 
                             (row['ค่าตอบแทนเงินประจำตำแหน่ง'] || 0) + 
                             (row['เงินตำแหน่งบริหาร'] || 0);
    });

    // Staff type statistics
    const staffTypeData = {};
    rawData.forEach(row => {
      const type = row['ประเภทบุคลากร'];
      if (type && row.totalCompensation > 0) {
        if (!staffTypeData[type]) {
          staffTypeData[type] = { 
            total: 0, 
            count: 0, 
            min: Infinity, 
            max: -Infinity 
          };
        }
        staffTypeData[type].total += row.totalCompensation;
        staffTypeData[type].count += 1;
        staffTypeData[type].min = Math.min(staffTypeData[type].min, row.totalCompensation);
        staffTypeData[type].max = Math.max(staffTypeData[type].max, row.totalCompensation);
      }
    });

    const staffTypeChartData = Object.keys(staffTypeData)
      .map(type => ({
        name: type,
        average: Math.round(staffTypeData[type].total / staffTypeData[type].count),
        count: staffTypeData[type].count,
        min: staffTypeData[type].min,
        max: staffTypeData[type].max,
        totalCost: staffTypeData[type].total
      }))
      .sort((a, b) => b.average - a.average);

    // Generation statistics
    const genData = {};
    rawData.forEach(row => {
      const gen = row['Gen'];
      if (gen && row.totalCompensation > 0) {
        if (!genData[gen]) {
          genData[gen] = { total: 0, count: 0 };
        }
        genData[gen].total += row.totalCompensation;
        genData[gen].count += 1;
      }
    });

    const genChartData = Object.keys(genData)
      .map(gen => ({
        name: gen,
        average: Math.round(genData[gen].total / genData[gen].count),
        count: genData[gen].count
      }))
      .sort((a, b) => {
        // Sort by generation (B, X, Y, Z)
        const genOrder = { 'B': 0, 'X': 1, 'Y': 2, 'Z': 3 };
        return genOrder[a.name] - genOrder[b.name];
      });

    // Experience level statistics
    const expData = {};
    rawData.forEach(row => {
      const exp = row['Experience'];
      if (exp && row.totalCompensation > 0) {
        if (!expData[exp]) {
          expData[exp] = { total: 0, count: 0 };
        }
        expData[exp].total += row.totalCompensation;
        expData[exp].count += 1;
      }
    });

    const expOrder = {
      'New Hires (0-1)': 0,
      'Early Career (2-3)': 1,
      'Established Employees (4-7)': 2,
      'Experienced Employees (8-15)': 3,
      'Senior Employees (16-25)': 4,
      'Legacy Employees (26+)': 5,
      'Unknown': 6
    };

    const expChartData = Object.keys(expData)
      .map(exp => ({
        name: exp,
        average: Math.round(expData[exp].total / expData[exp].count),
        count: expData[exp].count,
        order: expOrder[exp] || 99
      }))
      .sort((a, b) => a.order - b.order);

    // Age group statistics
    const ageGroups = {};
    rawData.forEach(row => {
      const age = row['อายุตัว (ปี)'];
      if (age && row.totalCompensation > 0) {
        const ageGroup = Math.floor(age / 5) * 5;
        const ageGroupLabel = `${ageGroup}-${ageGroup + 4}`;
        
        if (!ageGroups[ageGroupLabel]) {
          ageGroups[ageGroupLabel] = { total: 0, count: 0 };
        }
        
        ageGroups[ageGroupLabel].total += row.totalCompensation;
        ageGroups[ageGroupLabel].count += 1;
      }
    });

    const ageGroupChartData = Object.entries(ageGroups)
      .map(([ageGroup, data]) => ({
        name: ageGroup,
        average: Math.round(data.total / data.count),
        count: data.count
      }))
      .sort((a, b) => {
        const ageA = parseInt(a.name.split('-')[0]);
        const ageB = parseInt(b.name.split('-')[0]);
        return ageA - ageB;
      });

    // Department statistics
    const deptData = {};
    rawData.forEach(row => {
      const dept = row['สังกัด'];
      if (dept && row.totalCompensation > 0) {
        if (!deptData[dept]) {
          deptData[dept] = { total: 0, count: 0 };
        }
        deptData[dept].total += row.totalCompensation;
        deptData[dept].count += 1;
      }
    });

    const deptChartData = Object.keys(deptData)
      .map(dept => ({
        name: dept,
        average: Math.round(deptData[dept].total / deptData[dept].count),
        count: deptData[dept].count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Position level statistics
    const positionData = {};
    rawData.forEach(row => {
      const position = row['ระดับตำแหน่ง'];
      if (position && row.totalCompensation > 0) {
        if (!positionData[position]) {
          positionData[position] = { total: 0, count: 0 };
        }
        positionData[position].total += row.totalCompensation;
        positionData[position].count += 1;
      }
    });

    const positionChartData = Object.keys(positionData)
      .map(position => ({
        name: position,
        average: Math.round(positionData[position].total / positionData[position].count),
        count: positionData[position].count
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    // Staff type distribution
    const staffTypeDistribution = Object.keys(staffTypeData).map(type => ({
      name: type,
      value: staffTypeData[type].count
    }));

    // Academic vs Support distribution
    const workTypeData = {};
    rawData.forEach(row => {
      const type = row['สายงาน'];
      if (type) {
        workTypeData[type] = (workTypeData[type] || 0) + 1;
      }
    });

    const workTypeDistribution = Object.keys(workTypeData).map(type => ({
      name: type,
      value: workTypeData[type]
    }));

    return {
      staffTypeChartData,
      genChartData,
      expChartData,
      ageGroupChartData,
      deptChartData,
      positionChartData,
      staffTypeDistribution,
      workTypeDistribution,
      totalEmployees: rawData.length,
      averageSalary: Math.round(rawData.reduce((sum, row) => sum + (row['เงินเดือน'] || 0), 0) / rawData.length),
      averageTotalComp: Math.round(rawData.reduce((sum, row) => sum + (row.totalCompensation || 0), 0) / rawData.length)
    };
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">การวิเคราะห์ค่าตอบแทนบุคลากร มหาวิทยาลัยขอนแก่น</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">จำนวนบุคลากรทั้งหมด</h3>
            <p className="text-3xl font-bold text-blue-700">{data.totalEmployees.toLocaleString()}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">เงินเดือนเฉลี่ย</h3>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(data.averageSalary)}</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1">ค่าตอบแทนรวมเฉลี่ย</h3>
            <p className="text-3xl font-bold text-purple-700">{formatCurrency(data.averageTotalComp)}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex">
        <TabButton id="overview" label="ภาพรวม" active={activeTab === 'overview'} onClick={setActiveTab} />
        <TabButton id="demographics" label="ประชากรศาสตร์" active={activeTab === 'demographics'} onClick={setActiveTab} />
        <TabButton id="departments" label="หน่วยงาน" active={activeTab === 'departments'} onClick={setActiveTab} />
        <TabButton id="position" label="ตำแหน่ง" active={activeTab === 'position'} onClick={setActiveTab} />
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนตามประเภทบุคลากร</h2>
              <div className="mb-4">
                <div className="bg-blue-100 p-3 rounded-lg mb-4">
                  <h3 className="text-lg font-semibold mb-1">ค่าใช้จ่ายบุคลากรรวมต่อเดือน</h3>
                  <p className="text-3xl font-bold text-blue-700">{formatCurrency(data.staffTypeChartData.reduce((sum, item) => sum + item.totalCost, 0))}</p>
                  <p className="text-sm text-blue-600">คิดเป็นค่าใช้จ่ายต่อปีประมาณ {formatCurrency(data.staffTypeChartData.reduce((sum, item) => sum + item.totalCost, 0) * 12)}</p>
                </div>
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 p-2">ประเภทบุคลากร</th>
                        <th className="border border-gray-300 p-2">จำนวน</th>
                        <th className="border border-gray-300 p-2">ค่าตอบแทนเฉลี่ย/คน</th>
                        <th className="border border-gray-300 p-2">ค่าใช้จ่ายรวม/เดือน</th>
                        <th className="border border-gray-300 p-2">% ของงบประมาณ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.staffTypeChartData.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 p-2">{item.name}</td>
                          <td className="border border-gray-300 p-2 text-right">{item.count.toLocaleString()}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.average)}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.totalCost)}</td>
                          <td className="border border-gray-300 p-2 text-right">
                            {(item.totalCost / data.staffTypeChartData.reduce((sum, item) => sum + item.totalCost, 0) * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={data.staffTypeChartData} 
                  margin={{ top: 5, right: 20, left: 20, bottom: 90 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={90} />
                  <YAxis tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="average" name="ค่าตอบแทนเฉลี่ย" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนเฉลี่ยตามประสบการณ์</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={data.expChartData} 
                  margin={{ top: 5, right: 20, left: 20, bottom: 90 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={90} />
                  <YAxis tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="average" name="ค่าตอบแทนเฉลี่ย" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">สัดส่วนบุคลากรตามประเภท</h2>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.staffTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {data.staffTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">สัดส่วนบุคลากรตามสายงาน</h2>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.workTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {data.workTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'demographics' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนเฉลี่ยตามเจนเนอเรชัน</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={data.genChartData} 
                  margin={{ top: 5, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="average" name="ค่าตอบแทนเฉลี่ย" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-sm text-gray-600">
                <p>Generation B: ผู้ที่เกิดก่อนปี พ.ศ. 2489 (ก่อนปี 1946)</p>
                <p>Generation X: ผู้ที่เกิดระหว่างปี พ.ศ. 2508-2523 (1965-1980)</p>
                <p>Generation Y: ผู้ที่เกิดระหว่างปี พ.ศ. 2524-2539 (1981-1996)</p>
                <p>Generation Z: ผู้ที่เกิดหลังปี พ.ศ. 2540 (หลังปี 1997)</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนเฉลี่ยตามช่วงอายุ</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={data.ageGroupChartData}
                  margin={{ top: 5, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="average" name="ค่าตอบแทนเฉลี่ย" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div>
          <div className="bg-gray-50 p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนเฉลี่ยตามหน่วยงาน (Top 10)</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={data.deptChartData} 
                layout="vertical"
                margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="average" name="ค่าตอบแทนเฉลี่ย" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'position' && (
        <div>
          <div className="bg-gray-50 p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">ค่าตอบแทนเฉลี่ยตามระดับตำแหน่ง (Top 10)</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={data.positionChartData} 
                layout="vertical"
                margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(value/1000)}K`} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="average" name="ค่าตอบแทนเฉลี่ย" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-8 border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">ข้อเสนอแนะสำหรับผู้บริหาร HR</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">ข้อสังเกตสำคัญ</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>มีความแตกต่างของค่าตอบแทนระหว่างประเภทบุคลากรค่อนข้างสูง โดยเฉพาะระหว่างข้าราชการและพนักงานมหาวิทยาลัย</li>
              <li>บุคลากรที่มีประสบการณ์มาก (Legacy Employees) มีค่าตอบแทนสูงกว่าบุคลากรใหม่อย่างชัดเจน</li>
              <li>คณะแพทยศาสตร์มีสัดส่วนบุคลากรสูงถึง 55.91% ของบุคลากรทั้งหมด</li>
              <li>สัดส่วนบุคลากรสายสนับสนุนสูงกว่าสายวิชาการมาก (78.67% vs 18.12%)</li>
            </ul>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">ข้อเสนอแนะ</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>พิจารณาปรับโครงสร้างค่าตอบแทนสำหรับพนักงานมหาวิทยาลัยให้แข่งขันได้</li>
              <li>สร้างแผนรักษาบุคลากรรุ่นใหม่ (Gen Y และ Z) ที่มีค่าตอบแทนต่ำกว่าค่าเฉลี่ย</li>
              <li>พัฒนาเส้นทางอาชีพที่ชัดเจนสำหรับบุคลากรสายสนับสนุน</li>
              <li>ทบทวนอัตราส่วนบุคลากรสายสนับสนุนต่อสายวิชาการ เพื่อเพิ่มประสิทธิภาพการบริหารงบประมาณ</li>
              <li>วางแผนสืบทอดตำแหน่งสำหรับบุคลากรที่จะเกษียณอายุในอีก 5-10 ปี</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryDashboard;