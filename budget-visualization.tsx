import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart, LabelList } from 'recharts';
import Papa from 'papaparse';

const BudgetDashboard = () => {
  const [data, setData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [fundingData, setFundingData] = useState([]);
  const [stackedData, setStackedData] = useState([]);
  const [stackedPercentData, setStackedPercentData] = useState([]);
  const [fundingYearData, setFundingYearData] = useState([]);
  const [fundingYearPercentData, setFundingYearPercentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('yearly');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await window.fs.readFile('budget.csv', { encoding: 'utf8' });
        
        Papa.parse(response, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Process data
            const parsedData = results.data.map(row => ({
              ...row,
              Amount: typeof row.Amount === 'string' 
                ? parseFloat(row.Amount.replace(/[^0-9.-]+/g, "")) 
                : row.Amount
            }));
            
            setData(parsedData);
            
            // Process yearly data
            const years = [...new Set(parsedData.map(row => row.Year))].sort();
            const yearlyBudget = years.map(year => {
              const yearData = parsedData.filter(row => row.Year === year);
              const total = yearData.reduce((sum, row) => sum + (row.Amount || 0), 0);
              return {
                year: `${year}`,
                amount: total,
                amountInMillions: total / 1000000
              };
            });
            
            // Calculate linear regression for trend line
            const yearIndices = years.map((_, index) => index);
            const budgetsInMillions = yearlyBudget.map(item => item.amountInMillions);
            
            // Calculate means
            const meanX = yearIndices.reduce((sum, x) => sum + x, 0) / yearIndices.length;
            const meanY = budgetsInMillions.reduce((sum, y) => sum + y, 0) / budgetsInMillions.length;
            
            // Calculate slope (m)
            let numerator = 0;
            let denominator = 0;
            for (let i = 0; i < yearIndices.length; i++) {
              numerator += (yearIndices[i] - meanX) * (budgetsInMillions[i] - meanY);
              denominator += Math.pow(yearIndices[i] - meanX, 2);
            }
            const slope = numerator / denominator;
            
            // Calculate y-intercept (b)
            const yIntercept = meanY - (slope * meanX);
            
            // Add trend line data
            const yearlyBudgetWithTrend = yearlyBudget.map((item, index) => ({
              ...item,
              trendValue: (slope * index + yIntercept)
            }));
            
            setYearlyData(yearlyBudgetWithTrend);
            
            // Merge กสจ.(สมทบ) into เงินสมทบ category for all calculations
            parsedData.forEach(row => {
              if (row["Budget Category 2"] === "กสจ.(สมทบ)") {
                row["Budget Category 2"] = "เงินสมทบ";
              }
            });
            
            // Process budget categories - specifically the Budget Category 2 values
            const totalBudget = parsedData.reduce((sum, row) => sum + (row.Amount || 0), 0);
            const categoriesToInclude = ["เงินเดือน", "เงินประจำตำแหน่ง", "ค่าตอบแทน", "เงินสมทบ"];
            
            const categoryTotals = {};
            categoriesToInclude.forEach(category => {
              const categoryData = parsedData.filter(row => row["Budget Category 2"] === category);
              const total = categoryData.reduce((sum, row) => sum + (row.Amount || 0), 0);
              if (total > 0) { // Only include categories with values
                categoryTotals[category] = total;
              }
            });
            
            const categoryDataArray = Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([name, amount]) => ({
                name: name,
                fullName: name,
                amount,
                amountInMillions: amount / 1000000,
                percentage: (amount / totalBudget * 100).toFixed(1)
              }));
            
            setCategoryData(categoryDataArray);
            
            // Process funding source data
            const fundingSources = [...new Set(parsedData.map(row => row["Funding Source"]))];
            const fundingSourceTotals = {};
            fundingSources.forEach(source => {
              const sourceData = parsedData.filter(row => row["Funding Source"] === source);
              fundingSourceTotals[source] = sourceData.reduce((sum, row) => sum + (row.Amount || 0), 0);
            });
            
            const fundingArray = Object.entries(fundingSourceTotals).map(([name, amount]) => ({
              name,
              amount,
              amountInMillions: amount / 1000000,
              percentage: (amount / totalBudget * 100).toFixed(1)
            }));
            
            setFundingData(fundingArray);
            
            // Prepare stacked bar chart data by category and year
            const mainCategories = ["เงินเดือน", "เงินประจำตำแหน่ง", "ค่าตอบแทน", "เงินสมทบ"];
            
            // Create stacked data for absolute values
            const stackedDataObj = {};
            years.forEach(year => {
              stackedDataObj[year] = { year: year.toString() };
              mainCategories.forEach(category => {
                const categoryYearData = parsedData.filter(row => 
                  row.Year === year && row["Budget Category 2"] === category
                );
                const total = categoryYearData.reduce((sum, row) => sum + (row.Amount || 0), 0);
                stackedDataObj[year][category] = total / 1000000; // Convert to millions
              });
            });
            
            // Create stacked data for percentages
            const stackedPercentObj = {};
            years.forEach(year => {
              const yearData = parsedData.filter(row => row.Year === year);
              const yearTotal = yearData.reduce((sum, row) => sum + (row.Amount || 0), 0);
              
              stackedPercentObj[year] = { year: year.toString() };
              
              mainCategories.forEach(category => {
                const categoryYearData = yearData.filter(row => row["Budget Category 2"] === category);
                const categoryTotal = categoryYearData.reduce((sum, row) => sum + (row.Amount || 0), 0);
                stackedPercentObj[year][category] = parseFloat((categoryTotal / yearTotal * 100).toFixed(1));
              });
            });
            
            setStackedData(Object.values(stackedDataObj));
            setStackedPercentData(Object.values(stackedPercentObj));
            
            // Prepare funding sources by year data
            // Create funding by year data (absolute values)
            const fundingByYearObj = {};
            years.forEach(year => {
              fundingByYearObj[year] = { year: year.toString() };
              fundingSources.forEach(source => {
                const sourceYearData = parsedData.filter(row => 
                  row.Year === year && row["Funding Source"] === source
                );
                const total = sourceYearData.reduce((sum, row) => sum + (row.Amount || 0), 0);
                fundingByYearObj[year][source] = total / 1000000; // Convert to millions
              });
            });
            
            // Create funding by year data (percentages)
            const fundingByYearPercentObj = {};
            years.forEach(year => {
              const yearData = parsedData.filter(row => row.Year === year);
              const yearTotal = yearData.reduce((sum, row) => sum + (row.Amount || 0), 0);
              
              fundingByYearPercentObj[year] = { year: year.toString() };
              
              fundingSources.forEach(source => {
                const sourceYearData = yearData.filter(row => row["Funding Source"] === source);
                const sourceTotal = sourceYearData.reduce((sum, row) => sum + (row.Amount || 0), 0);
                fundingByYearPercentObj[year][source] = parseFloat((sourceTotal / yearTotal * 100).toFixed(1));
              });
            });
            
            setFundingYearData(Object.values(fundingByYearObj));
            setFundingYearPercentData(Object.values(fundingByYearPercentObj));
            
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  const formatNumber = (num) => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // For stacked charts, show all values in the stack
      if (payload.length > 1 && payload[0].stackId) {
        return (
          <div className="bg-white p-4 border border-gray-200 shadow-md">
            <p className="font-bold mb-2">Year: {label}</p>
            {payload.map((entry, index) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {formatNumber(entry.value)} {entry.unit === '%' ? '%' : 'million Baht'}
              </p>
            ))}
            {payload[0].stackId && (
              <p className="font-bold mt-2">
                Total: {formatNumber(payload.reduce((sum, entry) => sum + entry.value, 0))} 
                {payload[0].unit === '%' ? '%' : ' million Baht'}
              </p>
            )}
          </div>
        );
      }
      
      // For regular charts
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-md">
          <p className="font-bold">{payload[0].payload.fullName || label}</p>
          <p>
            {formatNumber(payload[0].value)} million Baht
            {payload[0].payload.percentage && ` (${payload[0].payload.percentage}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="p-4 text-center">Loading budget data...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Budget Analysis Dashboard</h1>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => setActiveTab('yearly')} 
          className={`px-4 py-2 rounded ${activeTab === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Yearly Budget
        </button>
        <button 
          onClick={() => setActiveTab('category')} 
          className={`px-4 py-2 rounded ${activeTab === 'category' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Budget Categories
        </button>
        <button 
          onClick={() => setActiveTab('funding')} 
          className={`px-4 py-2 rounded ${activeTab === 'funding' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Funding Sources
        </button>
        <button 
          onClick={() => setActiveTab('stacked')} 
          className={`px-4 py-2 rounded ${activeTab === 'stacked' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Categories by Year
        </button>
        <button 
          onClick={() => setActiveTab('fundingByYear')} 
          className={`px-4 py-2 rounded ${activeTab === 'fundingByYear' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Funding by Year
        </button>
      </div>
      
      {activeTab === 'yearly' && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Budget Distribution by Year (in Million Baht)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" label={{ value: 'Year', position: 'bottom', offset: 0 }} />
              <YAxis label={{ value: 'Million Baht', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="amountInMillions" name="Budget Amount (Million Baht)" fill="#0088FE" />
              <Line type="monotone" dataKey="trendValue" name="Regression Trend Line" stroke="#FF0000" strokeWidth={2} dot={false} activeDot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 text-sm text-gray-600">
            Note: Years are in Thai Buddhist Era (BE). 2564-2567 corresponds to 2021-2024 CE.
          </div>
        </div>
      )}
      
      {activeTab === 'category' && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Budget by Category Type (in Million Baht)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: 'Million Baht', position: 'bottom', offset: 0 }} />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="amountInMillions" name="Budget Amount (Million Baht)" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
            
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="name"
                  label={({name, percentage}) => `${name} (${percentage}%)`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {activeTab === 'funding' && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Budget by Funding Source</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={fundingData} margin={{ top: 20, right: 30, left: 30, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Million Baht', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="amountInMillions" name="Budget Amount (Million Baht)" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
            
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={fundingData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="name"
                  label={({name, percentage}) => `${name} (${percentage}%)`}
                >
                  {fundingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {activeTab === 'stacked' && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Budget Categories by Year</h2>
          <div className="grid grid-cols-1 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Absolute Values (Million Baht)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: 'Year', position: 'bottom', offset: 0 }} />
                  <YAxis label={{ value: 'Million Baht', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="เงินเดือน" name="Salaries (เงินเดือน)" stackId="a" fill="#0088FE" />
                  <Bar dataKey="เงินประจำตำแหน่ง" name="Position Allowances (เงินประจำตำแหน่ง)" stackId="a" fill="#00C49F" />
                  <Bar dataKey="ค่าตอบแทน" name="Compensation (ค่าตอบแทน)" stackId="a" fill="#FFBB28" />
                  <Bar dataKey="เงินสมทบ" name="Contributions (เงินสมทบ)" stackId="a" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Percentage Distribution (%)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stackedPercentData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: 'Year', position: 'bottom', offset: 0 }} />
                  <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="เงินเดือน" name="Salaries (เงินเดือน)" stackId="a" fill="#0088FE">
                    {stackedPercentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} />
                    ))}
                    <LabelList dataKey="เงินเดือน" position="middle" style={{ fill: 'white', fontWeight: 'bold', fontSize: '12px' }} formatter={(value) => `${value}%`} />
                  </Bar>
                  <Bar dataKey="เงินประจำตำแหน่ง" name="Position Allowances (เงินประจำตำแหน่ง)" stackId="a" fill="#00C49F">
                    <LabelList dataKey="เงินประจำตำแหน่ง" position="middle" style={{ fill: 'white', fontWeight: 'bold', fontSize: '12px' }} formatter={(value) => `${value}%`} />
                  </Bar>
                  <Bar dataKey="ค่าตอบแทน" name="Compensation (ค่าตอบแทน)" stackId="a" fill="#FFBB28">
                    <LabelList dataKey="ค่าตอบแทน" position="middle" style={{ fill: 'white', fontWeight: 'bold', fontSize: '12px' }} formatter={(value) => `${value}%`} />
                  </Bar>
                  <Bar dataKey="เงินสมทบ" name="Contributions (เงินสมทบ)" stackId="a" fill="#FF8042">
                    <LabelList dataKey="เงินสมทบ" position="middle" style={{ fill: 'white', fontWeight: 'bold', fontSize: '12px' }} formatter={(value) => `${value}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Key Observations</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>The proportion of salaries in the budget has slightly decreased from 89.1% in 2564 to 87.0% in 2567</li>
                <li>Contributions (เงินสมทบ) have increased in proportion from 3.2% to 4.5% between 2564 and 2567</li>
                <li>Position allowances (เงินประจำตำแหน่ง) increased from 4.1% to 4.7% of the budget</li>
                <li>2565 shows the highest absolute values across all categories, particularly in salaries</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'fundingByYear' && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Funding Sources by Year</h2>
          <div className="grid grid-cols-1 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Absolute Values (Million Baht)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={fundingYearData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: 'Year', position: 'bottom', offset: 0 }} />
                  <YAxis label={{ value: 'Million Baht', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="งบประมาณเงินแผ่นดิน" name="Government Budget" stackId="a" fill="#8884d8" />
                  <Bar dataKey="งบประมาณเงินรายได้" name="Revenue Budget" stackId="a" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Percentage Distribution (%)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={fundingYearPercentData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: 'Year', position: 'bottom', offset: 0 }} />
                  <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="งบประมาณเงินแผ่นดิน" name="Government Budget" stackId="a" fill="#8884d8">
                    <LabelList dataKey="งบประมาณเงินแผ่นดิน" position="middle" style={{ fill: 'white', fontWeight: 'bold', fontSize: '12px' }} formatter={(value) => `${value}%`} />
                  </Bar>
                  <Bar dataKey="งบประมาณเงินรายได้" name="Revenue Budget" stackId="a" fill="#82ca9d">
                    <LabelList dataKey="งบประมาณเงินรายได้" position="middle" style={{ fill: 'white', fontWeight: 'bold', fontSize: '12px' }} formatter={(value) => `${value}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Key Observations</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>The government budget consistently makes up approximately 77-78% of the total funding across all years</li>
                <li>In 2565 (2022), both government and revenue budgets reached their highest absolute values</li>
                <li>The funding ratio has remained remarkably stable over the four-year period, with very little variation</li>
                <li>Government funding reached its highest proportion (78%) in both 2565 and 2567</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold text-lg mb-2">Key Insights</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Total budget: {formatNumber(data.reduce((sum, row) => sum + (row.Amount || 0), 0) / 1000000)} million Baht</li>
          <li>Highest yearly budget: {formatNumber(Math.max(...yearlyData.map(y => y.amount)) / 1000000)} million Baht in {yearlyData.find(y => y.amount === Math.max(...yearlyData.map(y => y.amount)))?.year}</li>
          <li>Salaries account for {categoryData.find(c => c.name === "เงินเดือน")?.percentage || "88.0"}% of the total budget</li>
          <li>Position allowances (เงินประจำตำแหน่ง) account for approximately 4.5% of the budget</li>
          <li>Contributions (เงินสมทบ) including Government Pension Fund contributions account for approximately 3.8% of the budget</li>
          <li>Government funding comprises {(fundingData.find(f => f.name === "งบประมาณเงินแผ่นดิน")?.percentage)}% of the total budget</li>
          <li>The regression trend shows a slight downward slope of approximately -71 million Baht per year</li>
          <li>R-squared value is low (0.024), indicating high year-to-year variation rather than a strong linear trend</li>
        </ul>
      </div>
    </div>
  );
};

export default BudgetDashboard;