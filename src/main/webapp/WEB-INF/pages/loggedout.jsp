<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--
  Created by IntelliJ IDEA.
  User: Austin Lowell
  Date: 12/5/2016
  Time: 1:23 AM
  To change this template use File | Settings | File Templates.
--%>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>Logged Out</title>
</head>
<body>
<h3>You have been successfully logged out</h3>
<button onclick="window.location.href='<c:url value="/main" />'">Back to the Main Menu</button>
</body>
</html>