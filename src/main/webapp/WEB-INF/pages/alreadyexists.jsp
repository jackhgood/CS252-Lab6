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
    <title>Account Already Exists</title>
</head>
<body>
<h3>An account already exists with that username.  Please try again</h3>
<button onclick="window.location.href='<c:url value="/register" />'">Back to the Registration Page</button>
</body>
</html>