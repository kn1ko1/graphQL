// script.js

// Use environment variables or a configuration file for endpoints
const API_BASE_URL = 'https://learn.01founders.co/api';
const graphqlEndpoint = `${API_BASE_URL}/graphql-engine/v1/graphql`;
const signinEndpoint = `${API_BASE_URL}/auth/signin`;


// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function () {
  // Get the login form element by its ID
  const loginForm = document.getElementById('loginForm');

  // Check if the login form exists
  if (loginForm) {
    // Add a 'submit' event listener to the login form
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault(); // Prevent the default form submission behavior
      login(); // Call the login function when the form is submitted
    });
  }

  // Get the logout button element by its ID
  const logoutButton = document.getElementById('logoutButton');

  // Check if the logout button exists
  if (logoutButton) {
    // Add a 'click' event listener to the logout button
    logoutButton.addEventListener('click', logout);
      //logout(); // Call the logout function when the button is clicked
  }
});

// Logout function
function logout() {
  localStorage.removeItem('token'); // Remove the token from local storage

  // Redirect to the login page or perform any other necessary cleanup
  window.location.href = 'login.html'; // Adjust the URL based on your project structure
}

// Asynchronous function to handle user login
async function login() {
  // Get the values of the email or username and password fields
  const identifier = document.getElementById('identifier').value;
  const password = document.getElementById('password').value;

  // Create a Basic Authentication header using Base64 encoding
  const authheader = "Basic " + btoa(`${identifier}:${password}`);
  //console.log('Attempting login with:', identifier, password);

  try {
    // Send a POST request to the authentication endpoint
    const res = await fetch(signinEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': authheader,
        'Content-Type': 'application/json',
      },
    });

    // Check if the authentication was successful
    if (!res.ok) {
      // Display an alert if authentication fails
      alert('Incorrect email or password. Please try again');
      throw new Error('Authentication failed');
    }

    // Parse the response JSON to get the authentication token
    const tokenData = await res.json();
    console.log('Received token data:', tokenData);

    const authToken = tokenData;

    localStorage.setItem("token", authToken);

    document.getElementById("loginForm").style.display = "none";
    document.getElementById('profilePage').style.display = 'block';

    console.log('Stored auth token:', tokenData);

    // Fetch user data and XP data
    const userData = await getData(userLoginQuery, authToken);
    const xpData = await getData(actualXPQuery, authToken);
    const skillProg = await getData(skillProgQuery, authToken);
    const technoProg = await getData(technoProgQuery, authToken);

    console.log('Fetched user data:', userData);
    console.log('Fetched XP data:', xpData.data.transaction_aggregate.aggregate.sum.amount);
    //console.log('Fetched best skills:', skillProg);

    // Extract user information
    const user = userData.data.user[0];
    const score = userData.data.transaction[0]; // Adjust the index based on your response structure
    const userSkillProg = userData.data.user[0].skills;
    console.log("User data:", user);
    console.log("XP score:", score);
    //console.log("Best skills:", userSkillProg);

    // Update the DOM with user information
    document.getElementById('userId').innerHTML = `Username: ${user.login}<br>ID: ${user.id}<br>Total XP: ${xpData.data.transaction_aggregate.aggregate.sum.amount}`;
    //data.transaction_aggregate.aggregate.sum.amount

    // Generate and display a bar chart
    generateBarChart(skillProg.data.transaction);
    generateSecondBarChart(technoProg.data.transaction);
    //console.log(skillProgQuery);
  } catch (error) {
    // Handle errors during login and log to the console
    console.error('Error during login:', error);
  }
}


// Function to fetch data from GraphQL endpoint
async function getData(query, authToken) {
  try {
  const res = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return await res.json();
} catch (error) {
  console.error('Error fetching data:', error);
}
}

//AUDIT RATIO SECTION BEGINS HERE
//basic query to find audit ratio data
const queryAuditRatio = `
query {
    transaction {
        type
        amount
    }
}
`;

//used to get user audit ratio from query
async function auditRatio() {

let responseData = await getData(queryAuditRatio)
const transactions = responseData.data.transaction;

let totalUp = 0;
let totalDown = 0;

//chooses particular transactions labeled up and down
transactions.forEach((transaction) => {
    if (transaction.type === "up") {
        totalUp += transaction.amount;
    } else if (transaction.type === "down") {
        totalDown += transaction.amount;
    }
});

//does the calculation to find audit ratio and then rounds it
const auditRatio = totalUp / totalDown;
const roundedAuditRatio = Math.round(auditRatio * 10) / 10;

// Log or display the calculated audit ratio
console.log("Audit Ratio:", roundedAuditRatio);
return roundedAuditRatio
 }

// GraphQL query to fetch user data
const userLoginQuery = `
  query {
    user {
      id
      login
    }
    transaction {
      id
      type
      amount
      userId
      path
    }
  }
`;

// GraphQL query to fetch XP data
const actualXPQuery = `
  query {
    transaction_aggregate(where: {type: {_eq: "xp"}, path: {_regex: "/london/div-01"}, eventId: {_lte: 134}}) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

// GraphQL query to fetch User Best skills
const skillProgQuery = `
  query {
    transaction(where: { type: { _in: ["skill_prog", "skill_algo", "skill_sys-admin", "skill_front-end", "skill_back-end", "skill_stats", "skill_game" ]}}) {
      type
      amount
    }
  }
`;

// GraphQL query to fetch User Technological skills
const technoProgQuery = `
  query {
    transaction(where: { type: { _in: ["skill_go", "skill_js", "skill_html", "skill_css", "skill_docker", "skill_sql", "skill_graphql"]}}) {
      type
      amount
    }
  }
`;



// Function to generate a bar chart using D3.js
function generateBarChart(skillProgData) {
  console.log(skillProgData)
  try {
    // Extract skill IDs and amounts from the fetched data
    const data = skillProgData.map(item => ({
      skill_id: item.type,
      amount: item.amount
    }));

    console.log("THIS IS SKILLPROGQUERY DATA", data)

      // Initialize total amounts for each skill category
      let totalSkillprog = 0;
      let totalSkillalgo = 0;
      let totalSkillsysadmin = 0;
      let totalSkillfrontend = 0;
      let totalSkillbackend = 0;
      let totalSkillstats = 0;
      let totalSkillgame = 0;
  
      // Accumulate the amounts based on skill categories
      data.forEach((transaction) => {
        if (transaction.skill_id === "skill_prog") {
          totalSkillprog += transaction.amount;
        } else if (transaction.skill_id === "skill_algo") {
          totalSkillalgo += transaction.amount;
        } else if (transaction.skill_id === "skill_sys-admin") {
          totalSkillsysadmin += transaction.amount;
        } else if (transaction.skill_id === "skill_front-end") {
          totalSkillfrontend += transaction.amount;
        } else if (transaction.skill_id === "skill_back-end") {
          totalSkillbackend += transaction.amount;
        } else if (transaction.skill_id === "skill_stats") {
          totalSkillstats += transaction.amount;
        } else if (transaction.skill_id === "skill_game") {
          totalSkillgame += transaction.amount;
        }
      });

      console.log("this is prog amount", totalSkillprog);
      console.log("this is algo amount", totalSkillalgo);
      console.log("this is sys admin amount", totalSkillsysadmin);
      console.log("this is frontend amount", totalSkillfrontend);
      console.log("this is backend amount", totalSkillbackend);
      console.log("this is stats amount", totalSkillstats);
      console.log("this is game amount", totalSkillgame);

// Data for the bar chart
const chartData = [
  { skill: "Prog", amount: totalSkillprog },
  { skill: "Algo", amount: totalSkillalgo },
  { skill: "Sys Admin", amount: totalSkillsysadmin },
  { skill: "Frontend", amount: totalSkillfrontend },
  { skill: "Backend", amount: totalSkillbackend },
  { skill: "Stats", amount: totalSkillstats },
  { skill: "Game", amount: totalSkillgame },
];

// Set up SVG dimensions
const width = 800;
const height = 400;
const margin = { top: 20, right: 20, bottom: 50, left: 50 };
const barWidth = (width - margin.left - margin.right) / chartData.length;

    // Select the container
    const container = document.getElementById('firstBarChart');
    container.innerHTML = ''; // Clear any previous SVG content

// Create SVG element
const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("width", width);
svg.setAttribute("height", height);
svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

// Find the maximum amount for scaling
const maxAmount = Math.max(...chartData.map(d => d.amount));

// Create bars and labels
chartData.forEach((d, i) => {
  // Calculate bar height
  const barHeight = (d.amount / maxAmount) * (height - margin.top - margin.bottom);

  // Create bar
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", margin.left + i * barWidth);
  rect.setAttribute("y", height - margin.bottom - barHeight);
  rect.setAttribute("width", barWidth - 10); // 10 is for spacing between bars
  rect.setAttribute("height", barHeight);
  rect.setAttribute("fill", "steelblue");
  svg.appendChild(rect);

  // Create label for value
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", margin.left + i * barWidth + (barWidth - 10) / 2);
  text.setAttribute("y", height - margin.bottom - barHeight - 5);
  text.setAttribute("text-anchor", "middle");
  text.textContent = d.amount;
  svg.appendChild(text);

  // Create label for skill name
  const skillText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  skillText.setAttribute("x", margin.left + i * barWidth + (barWidth - 10) / 2);
  skillText.setAttribute("y", height - margin.bottom + 20);
  skillText.setAttribute("text-anchor", "middle");
  skillText.textContent = d.skill;
  svg.appendChild(skillText);
});

   // Append SVG to the container
   container.appendChild(svg);

  } catch (error) {
    console.error('Error generating bar chart:', error);
  }
}

// Function to generate a bar chart using D3.js
function generateSecondBarChart(technoProgData) {
  console.log(technoProgData)
  try {
    // Extract skill IDs and amounts from the fetched data
    const data = technoProgData.map(item => ({
      skill_id: item.type,
      amount: item.amount
    }));

    console.log("THIS IS TECHNOPROGQUERY DATA", data)

      // Initialize total amounts for each skill category
      let totalSkillgo = 0;
      let totalSkilljs = 0;
      let totalSkillhtml = 0;
      let totalSkillcss = 0;
      let totalSkilldocker = 0;
      let totalSkillsql = 0;
      let totalSkillgraphql = 0;
  
      // Accumulate the amounts based on skill categories
      data.forEach((transaction) => {
        if (transaction.skill_id === "skill_go") {
          totalSkillgo += transaction.amount;
        } else if (transaction.skill_id === "skill_js") {
          totalSkilljs += transaction.amount;
        } else if (transaction.skill_id === "skill_html") {
          totalSkillhtml += transaction.amount;
        } else if (transaction.skill_id === "skill_css") {
          totalSkillcss += transaction.amount;
        } else if (transaction.skill_id === "skill_docker") {
          totalSkilldocker += transaction.amount;
        } else if (transaction.skill_id === "skill_sql") {
          totalSkillsql += transaction.amount;
        } else if (transaction.skill_id === "skill_graphql") {
          totalSkillgraphql += transaction.amount;
        }
      });

      console.log("this is go amount", totalSkillgo);
      console.log("this is js amount", totalSkilljs);
      console.log("this is html amount", totalSkillhtml);
      console.log("this is css amount", totalSkillcss);
      console.log("this is docker amount", totalSkilldocker);
      console.log("this is sql amount", totalSkillsql);
      console.log("this is graphql amount", totalSkillgraphql);

          // Data for the bar chart
    const chartData = [
      { skill: "Go", amount: totalSkillgo },
      { skill: "JavaScript", amount: totalSkilljs },
      { skill: "HTML", amount: totalSkillhtml },
      { skill: "CSS", amount: totalSkillcss },
      { skill: "Docker", amount: totalSkilldocker },
      { skill: "SQL", amount: totalSkillsql },
      { skill: "GraphQL", amount: totalSkillgraphql },
    ];

    // Set up SVG dimensions
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const barWidth = (width - margin.left - margin.right) / chartData.length;

      // Select the container
      const container = document.getElementById('secondBarChart');
      container.innerHTML = ''; // Clear any previous SVG content

    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Find the maximum amount for scaling
    const maxAmount = Math.max(...chartData.map(d => d.amount));

    // Create bars and labels
    chartData.forEach((d, i) => {
      // Calculate bar height
      const barHeight = (d.amount / maxAmount) * (height - margin.top - margin.bottom);

      // Create bar
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", margin.left + i * barWidth);
      rect.setAttribute("y", height - margin.bottom - barHeight);
      rect.setAttribute("width", barWidth - 10); // 10 is for spacing between bars
      rect.setAttribute("height", barHeight);
      rect.setAttribute("fill", "steelblue");
      svg.appendChild(rect);

      // Create label for value
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", margin.left + i * barWidth + (barWidth - 10) / 2);
      text.setAttribute("y", height - margin.bottom - barHeight - 5);
      text.setAttribute("text-anchor", "middle");
      text.textContent = d.amount;
      svg.appendChild(text);

      // Create label for skill name
      const skillText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      skillText.setAttribute("x", margin.left + i * barWidth + (barWidth - 10) / 2);
      skillText.setAttribute("y", height - margin.bottom + 20);
      skillText.setAttribute("text-anchor", "middle");
      skillText.textContent = d.skill;
      svg.appendChild(skillText);
    });

   container.appendChild(svg);


    } catch (error) {
      console.error('Error generating bar chart:', error);
    }
    }