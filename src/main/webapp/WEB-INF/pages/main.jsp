<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://www.springframework.org/tags" prefix="spring" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ page language="java" pageEncoding="UTF-8" session="false"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Gateway</title>

    <link rel="stylesheet" href="<c:url value="/css/main.css" />" />
</head>
<body>

<h2>Gateway</h2>
<a href="<c:url value="/play" />">play</a>
${message}

</body>
</html>